import sqlite3
import os
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional

logger = logging.getLogger("downloader.db")

class DatabaseManager:
    """
    Production-grade SQLite worker. Wraps connection states on a per-thread or single database base.
    Tracks users, rate limit timestamps, statistics, and system logs.
    """
    def __init__(self, db_path: str = "downloader.db"):
        self.db_path = db_path
        # Ensure parent directory exists (critical if path is inside another directory like /tmp)
        parent_dir = os.path.dirname(self.db_path)
        if parent_dir:
            os.makedirs(parent_dir, exist_ok=True)
        self._initialize_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _initialize_db(self):
        """Creates professional audit logs, rate limiters, and stats tables."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Users Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER PRIMARY KEY,
                    username TEXT,
                    language_code TEXT,
                    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_request_at TIMESTAMP,
                    is_blocked INTEGER DEFAULT 0
                )
            """)
            
            # Downloads History Table (Audit logs)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS downloads (
                    id TEXT PRIMARY KEY,
                    user_id INTEGER,
                    platform TEXT,
                    url TEXT,
                    file_size TEXT,
                    status TEXT,
                    duration REAL,
                    error TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Cache Table to avoid duplicate downloads
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS metadata_cache (
                    url_hash TEXT PRIMARY KEY,
                    title TEXT,
                    file_size TEXT,
                    best_format_url TEXT,
                    extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
            logger.info("SQLite Database initialized with full schema.")

    def register_user(self, user_id: int, username: Optional[str] = None, lang: Optional[str] = "ar"):
        """Registers a new User or updates active communication timestamps."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO users (user_id, username, language_code, last_request_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id) DO UPDATE SET
                    username = excluded.username,
                    language_code = excluded.language_code,
                    last_request_at = CURRENT_TIMESTAMP
            """, (user_id, username, lang))
            conn.commit()

    def check_rate_limit(self, user_id: int, cooldown_sec: int) -> tuple[bool, int]:
        """
        Validates lock timer limits. Returns (allowed, time_remaining).
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT last_request_at FROM users WHERE user_id = ?", (user_id,))
            row = cursor.fetchone()
            if not row or not row[0]:
                return True, 0
            
            try:
                # SQLite timestamp parsing
                last_req = datetime.strptime(row[0], "%Y-%m-%d %H:%M:%S")
            except ValueError:
                # Handle ISO formatting fallback
                last_req = datetime.fromisoformat(row[0].replace('Z', '+00:00'))
                
            elapsed = (datetime.utcnow() - last_req).total_seconds()
            if elapsed < cooldown_sec:
                return False, int(cooldown_sec - elapsed)
            return True, 0

    def log_download(self, download_id: str, user_id: int, platform: str, url: str, 
                     file_size: str, status: str, duration: float, error: Optional[str] = None):
        """Pushes structured telemetry variables safely into database history."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO downloads (id, user_id, platform, url, file_size, status, duration, error)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (download_id, user_id, platform, url, file_size, status, duration, error))
            conn.commit()

    def get_dashboard_metrics(self) -> Dict[str, Any]:
        """Extracts complete aggregates for the administrative analytics display."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("SELECT COUNT(*) FROM users")
            total_users = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(DISTINCT user_id) FROM downloads WHERE timestamp >= date('now')")
            active_users_today = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM downloads WHERE timestamp >= date('now')")
            downloads_today = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM downloads WHERE status = 'completed'")
            successful = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM downloads WHERE status = 'failed'")
            failed = cursor.fetchone()[0]
            
            return {
                "total_users": total_users,
                "active_users_today": active_users_today,
                "downloads_today": downloads_today,
                "successful_downloads": successful,
                "failed_downloads": failed
            }

    def get_recent_downloads(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Aids Admin UI view audits by fetching top sequential log rows."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT d.*, u.username FROM downloads d
                LEFT JOIN users u ON d.user_id = u.user_id
                ORDER BY d.timestamp DESC LIMIT ?
            """, (limit,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
