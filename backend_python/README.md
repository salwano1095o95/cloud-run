# Production Telegram Video Downloader Platform
### Deployed on Google Cloud Run & Deployed Programmatically

This directory contains the production-grade, highly performant asynchronous Python backend for the Telegram media acquisition bot, featuring:
- **FastAPI Core**: Ultra-fast, async ASGI processing.
- **yt-dlp Engine**: Best-in-class, robust video metadata extractor and media downloader.
- **SQLite Tracker**: Lightweight, ACID-compliant database tracking rate limits and audit logs, ready for Postgres migration.
- **Security Protections**: Active command injection prevention, path-traversal mitigation, SSRF safety, and webhook signature verification tokens.

---

## 1. Project Directory Structure
```
telegram-downloader-platform/
├── backend_python/             # Complete Python 3.12 FastAPI microservice
│   ├── config.py             # Pydantic settings & environment variables
│   ├── db.py                 # SQLite transaction managers & spam limits
│   ├── downloader.py         # yt-dlp async downloader & file system cleanup
│   ├── bot.py                # Telegram raw async HTTPS updates & Arabic interface
│   ├── main.py               # FastAPI routers, metrics (/metrics) & health checks
│   ├── requirements.txt      # PyPI dependencies (FastAPI, yt-dlp, psutil, httpx)
│   ├── Dockerfile            # Optimized python:3.12-slim with ffmpeg binary bindings
│   └── .dockerignore         # Docker context exclusions
```

---

## 2. Fast Deployment to Google Cloud Run

To deploy this microservice instantly, execute the following commands in your Google Cloud Shell:

```bash
# 1. Login and map your active project ID
gcloud auth login
gcloud config set project [YOUR_PROJECT_ID]

# 2. Build and push container to Google Artifact Registry (automatic Build Engine)
gcloud builds submit --tag gcr.io/[YOUR_PROJECT_ID]/telegram-downloader ./backend_python

# 3. Deploy to Cloud Run with 1GB RAM to give yt-dlp plenty of overhead space
gcloud run deploy telegram-downloader \
  --image gcr.io/[YOUR_PROJECT_ID]/telegram-downloader \
  --platform managed \
  --region europe-west2 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --set-env-vars="TELEGRAM_BOT_TOKEN=your_botfather_token_here,SECRET_TOKEN=SecureSecretValue123!,WEBHOOK_URL=https://[LINK]/telegram/webhook"
```

---

## 3. Webhook Security Strategy

### Webhook Verification Handshake
To protect `/telegram/webhook` from forgery, DDoS, and SSRF attacks, we utilize Telegram's **Secret Token Handshake**. During the `setWebhook` API call, we register a secure `X-Telegram-Bot-Api-Secret-Token` (configured via env).
Telegram attaches this header with every message it relays. The API rejects any payload missing this header, ensuring only legitimate Telegram server instances can push events to your Cloud Run URL.

### Input Sanitization & Paths 防御
- **No Pass-through Shells**: No raw commands are executed using `os.system` or `subprocess.POpen`. All downloads invoke the `yt_dlp` python interface programmatically.
- **Filename Hardening**: Using `restrictfilenames` inside `yt-dlp` guarantees resulting filenames contain only safe alphanumeric characters and dashes, stopping path traversal attacks.
- **Strict UUID Pre-allocation**: We generate a unique random UUID for each download temp-output, completely isolating processing states.

---

## 4. Performance Optimizations & Resource Safety

- **Asynchronous Loop Delegation**: Since metadata extraction and video downloading are blocking operations, we wrap them in non-blocking thread executors via `asyncio.to_thread`.
- **Stateless Cloud Run /tmp Storage**: Porting the downloads to `/tmp/downloads` exploits Cloud Run's in-memory `tmpfs` virtual system, granting speeds close to pure RAM operations.
- **Active Disk Sweep**: Completed videos are deleted immediately after delivery. A background cleaning loop sweeps any abandoned files older than 15 minutes.

---

## 5. Enterprise Scaling Roadmaps

When expanding this platform to handle hundreds of thousands of users:
1. **Cloud SQL PostgreSQL Integration**: Update `DATABASE_URL` in `config.py` to target an auto-scaled Cloud SQL Postgres cluster.
2. **Distributed Queue Worker Split (Celery/Redis)**: Offload the `DownloadEngine` entirely to dedicated Celery worker pools. The FastAPI webhook will simply swallow the webhook trigger, queue the task to Redis/RabbitMQ within <10ms, and free up resources for incoming hooks.
3. **Google CDN Grounding**: Cache repeated video links (by hashing their URL) to skip downloading entirely and instantly forward Telegram's `file_id` cached payloads!
