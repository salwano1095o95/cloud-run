import os
import time
import shutil
import logging
from typing import Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Header, HTTPException, status, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel

try:
    from backend_python.config import settings
    from backend_python.db import DatabaseManager
    from backend_python.downloader import DownloadEngine
    from backend_python.bot import TelegramBot
except ImportError:
    from config import settings
    from db import DatabaseManager
    from downloader import DownloadEngine
    from bot import TelegramBot

# Setup structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("downloader.api")

# Application Database & Downloader Instances
db_path = settings.DATABASE_URL
if db_path.startswith("sqlite:///"):
    db_path = db_path[10:]
elif db_path.startswith("sqlite://"):
    db_path = db_path[9:]
db = DatabaseManager(db_path)
engine = DownloadEngine(settings.DOWNLOAD_DIR, settings.MAX_FILE_SIZE_MB)
bot = TelegramBot(db, engine)

async def cleanup_abandoned_temp_files():
    """
    Periodic task sweeping any residual partial download logs or files.
    Runs on startup and can be activated via request paths.
    """
    try:
        now = time.time()
        # Clean anything older than 15 minutes to save storage space on Cloud Run instance
        threshold_sec = 15 * 60 
        
        if os.path.exists(settings.DOWNLOAD_DIR):
            for filename in os.listdir(settings.DOWNLOAD_DIR):
                filepath = os.path.join(settings.DOWNLOAD_DIR, filename)
                if os.path.isfile(filepath):
                    elapsed = now - os.path.getmtime(filepath)
                    if elapsed > threshold_sec:
                        os.remove(filepath)
                        logger.info(f"Swept abandoned temporary file: {filename}")
    except Exception as e:
        logger.error(f"Error executing storage cleanup cycle: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles startup and shutdown events securely."""
    logger.info("Starting Telegram Downloader Platform API...")
    # Initialize webhook silently (safely handling cases with dummy test tokens)
    if "YOUR_DEFAULT_" not in settings.TELEGRAM_BOT_TOKEN:
        await bot.initialize_webhook()
    
    # Run initial temp files cleaner
    await cleanup_abandoned_temp_files()
    
    yield
    # Shutdown
    await bot.close()
    logger.info("Telegram Downloader Platform shut down gracefully.")

app = FastAPI(
    title="Telegram Video Downloader Platform",
    description="High-performance async API for Telegram media delivery.",
    version="2.1.0",
    lifespan=lifespan
)

# Request Models
class WebhookPayload(BaseModel):
    update_id: int
    message: Optional[dict] = None
    callback_query: Optional[dict] = None

@app.post("/telegram/webhook")
async def telegram_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_telegram_bot_api_secret_token: Optional[str] = Header(None, alias="X-Telegram-Bot-Api-Secret-Token")
):
    """
    Telegram webhook processing channel.
    Verifies secret token header to prevent SSRF and malicious spoofing.
    Processes updates concurrently in background tasks to guarantee ultra-fast <100ms response.
    """
    if settings.SECRET_TOKEN and x_telegram_bot_api_secret_token != settings.SECRET_TOKEN:
        logger.warning("Unauthorized update received (incorrect secret token). Rejected.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Hook validation failed"
        )
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request body payload"
        )

    # Queue update onto background task to prevent webhook timeout throttling from Telegram
    background_tasks.add_task(bot.handle_update, body)
    
    # Sweep storage residuals on another background task
    background_tasks.add_task(cleanup_abandoned_temp_files)
    
    return {"status": "queued"}

@app.get("/health")
async def health_check():
    """
    Cloud Run compatible health and readiness diagnostics.
    Validates state metrics and DB connections.
    """
    db_ok = False
    try:
        with db._get_connection() as conn:
            conn.execute("SELECT 1")
            db_ok = True
    except Exception as e:
        logger.error(f"Healthcheck Database connection failure: {e}")

    if not db_ok:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"status": "unhealthy", "database": "error"}
        )

    # Check safe available storage on tmp dir
    total, used, free = shutil.disk_usage(settings.DOWNLOAD_DIR)
    
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "database": "connected",
        "storage": {
            "total_gb": f"{total / (1024**3):.2f}",
            "free_gb": f"{free / (1024**3):.2f}"
        }
    }

@app.get("/metrics")
async def prometheus_metrics():
    """Outputs basic resource metrics and bot transaction statistics."""
    stats = db.get_dashboard_metrics()
    
    import psutil
    process = psutil.Process(os.getpid())
    memory_info = process.memory_info()
    
    # Calculate queue length from cache table sizes
    queue_count = 0
    with db._get_connection() as conn:
        row = conn.execute("SELECT COUNT(*) FROM metadata_cache").fetchone()
        queue_count = row[0] if row else 0

    return {
        "system_memory_used_mb": memory_info.rss / (1024 * 1024),
        "system_cpu_percent": psutil.cpu_percent(),
        "concurrency_limit": settings.MAX_CONCURRENT_DOWNLOADS,
        "active_queue_length": queue_count,
        **stats
    }

@app.get("/admin")
async def admin_dashboard_data():
    """Returns aggregated monitoring telemetry and historic log details."""
    stats = db.get_dashboard_metrics()
    recent_logs = db.get_recent_downloads(limit=50)
    
    return {
        "totals": stats,
        "recent_logs": recent_logs,
        "config": {
            "max_file_size_mb": settings.MAX_FILE_SIZE_MB,
            "rate_limit_cooldown_sec": settings.RATE_LIMIT_COOLDOWN_SEC,
            "temporary_dir": settings.DOWNLOAD_DIR
        }
    }

@app.post("/admin/cleanup")
async def force_cleanup(background_tasks: BackgroundTasks):
    """Enables manual cleanup of temporary folders via admin command requests."""
    background_tasks.add_task(cleanup_abandoned_temp_files)
    return {"message": "Storage sweeping requested"}
