# Multi-stage production Dockerfile for Telegram Video Downloader
# Optimized for Google Cloud Run (fast starts and low memory profile)

FROM python:3.12-slim AS builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install compiler dependencies for library bindings
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Compile wheels in build sandbox
RUN pip install --no-cache-dir --user -r requirements.txt


# FINAL RUNTIME STAGE
FROM python:3.12-slim AS runner

WORKDIR /app

# Install ffmpeg and clean apt caches to reduce image footprint
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy installed libraries from builder stage
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy source repository into backend_python package directory
COPY . /app/backend_python

# Set Python search path
ENV PYTHONPATH=/app

# Ensure we have dedicated directories for cache and downloads
RUN mkdir -p /tmp/downloads && chmod 777 /tmp/downloads

# Create a non-privileged system user to prevent container escaping
RUN useradd -u 8888 appuser && chown -R appuser:appuser /app
USER appuser

# Cloud Run binds to PORT environment variable dynamically (defaults to 3000)
ENV PORT=3000
EXPOSE 3000

# Run Uvicorn asynchronously
CMD uvicorn backend_python.main:app --host 0.0.0.0 --port 3000 --workers 2 --timeout-keep-alive 60
