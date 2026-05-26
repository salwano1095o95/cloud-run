import os
import re
import uuid
import asyncio
import logging
from typing import Dict, Any, Optional, Tuple
import yt_dlp

logger = logging.getLogger("downloader.engine")

class DownloadEngine:
    """
    Production-grade asynchronous yt-dlp downloader engine.
    Applies security sanitization, format filters (1080p, 720p, 480p, MP3),
    maximum sizing validations, and automatic file cleanup policies.
    """
    def __init__(self, download_dir: str = "/tmp/downloads", max_file_size_mb: int = 50):
        self.download_dir = download_dir
        self.max_file_size_mb = max_file_size_mb
        os.makedirs(self.download_dir, exist_ok=True)

    def extract_platform(self, url: str) -> Tuple[str, bool]:
        """
        Validates URL and extracts supported platform indicators.
        Filters out playlists and malicious injection links.
        """
        if not url or not isinstance(url, str):
            return "unknown", False
            
        # Basic injection and SSRF defenses (sanitize URL chars)
        clean_url = url.strip()
        if not re.match(r'^https?://[a-zA-Z0-9.\-_~:/?#[\]@!$&\'()*+,;=]+$', clean_url):
            return "unknown", False

        # Check for playlists
        if "playlist" in clean_url or "list=" in clean_url:
            return "unknown", False # Playlists are strictly rejected

        # Platform matching
        rules = {
            "youtube": r"(youtube\.com|youtu\.be|youtube-nocookie\.com)",
            "shorts": r"(youtube\.com/shorts)",
            "tiktok": r"(tiktok\.com)",
            "instagram": r"(instagram\.com)",
            "facebook": r"(facebook\.com|fb\.watch)"
        }
        
        for platform, regex in rules.items():
            if re.search(regex, clean_url, re.IGNORECASE):
                # Map shorts back to general youtube but flag supported
                actual_platform = "youtube" if platform == "shorts" else platform
                return actual_platform, True
                
        return "unknown", False

    async def extract_metadata(self, url: str) -> Optional[Dict[str, Any]]:
        """
        Extracts video metadata without executing download.
        Asynchronous execution is achieved via asyncio.to_thread.
        """
        ydl_opts = {
            'skip_download': True,
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
        }
        
        try:
            return await asyncio.to_thread(self._extract_info, url, ydl_opts)
        except Exception as e:
            logger.error(f"Failed to extract metadata for {url}: {e}")
            return None

    def _extract_info(self, url: str, opts: Dict[str, Any]) -> Dict[str, Any]:
        with yt_dlp.YoutubeDL(opts) as ydl:
            return ydl.extract_info(url, download=False)

    async def download_media(self, url: str, quality: str = "best") -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
        """
        Downloads target link under defined quality constraint formats (best, 1080p, 720p, 480p, mp3).
        Returns a (filepath, metadata) tuple. Filepath points to a safe temp file.
        """
        platform, supported = self.extract_platform(url)
        if not supported:
            logger.warning(f"Rejected unsupported URL: {url}")
            return None, None

        # Generate completely unique filenames to prevent path traversal and collision
        unique_id = str(uuid.uuid4())
        out_template = os.path.join(self.download_dir, f"{unique_id}_%(title).100s.%(ext)s")

        # Handle formatting selects
        format_spec = 'bestvideo+bestaudio/best'
        postprocessors = []

        if quality == "mp3":
            format_spec = 'bestaudio/best'
            postprocessors = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }]
        elif quality == "1080p":
            format_spec = 'bestvideo[height<=1080]+bestaudio/best[height<=1080]'
        elif quality == "720p":
            format_spec = 'bestvideo[height<=720]+bestaudio/best[height<=720]'
        elif quality == "480p":
            format_spec = 'bestvideo[height<=480]+bestaudio/best[height<=480]'

        ydl_opts = {
            'format': format_spec,
            'outtmpl': out_template,
            'restrictfilenames': True,  # Security: Sanitize filenames from complex characters
            'max_filesize': self.max_file_size_mb * 1024 * 1024, # Bytes
            'quiet': True,
            'no_warnings': True,
            'postprocessors': postprocessors,
            'nocheckcertificate': True,
            'ignoreerrors': False,
        }

        try:
            # Execute download blocking call inside safety thread pool
            info = await asyncio.to_thread(self._run_download, url, ydl_opts)
            
            # Resolve actual downloaded file path
            ext = "mp3" if quality == "mp3" else info.get('ext', 'mp4')
            downloaded_bytes = info.get('filesize', 0) or info.get('filesize_approx', 0)
            
            if downloaded_bytes > (self.max_file_size_mb * 1024 * 1024):
                logger.error(f"Download exceeded allowed size limit ({downloaded_bytes} bytes)")
                return None, None
            
            # Match actual filename on disk matching our unique prefix
            saved_file = None
            for filename in os.listdir(self.download_dir):
                if filename.startswith(unique_id):
                    # Guard file format extension matching mp3 overrides or general formats
                    if quality == "mp3" and filename.endswith(".mp3"):
                        saved_file = os.path.join(self.download_dir, filename)
                        break
                    elif quality != "mp3" and not filename.endswith(".part"):
                        saved_file = os.path.join(self.download_dir, filename)
                        break
            
            if saved_file and os.path.exists(saved_file):
                # Verify file integrity
                stat = os.stat(saved_file)
                if stat.st_size > 0:
                    info['actual_filepath'] = saved_file
                    info['actual_filesize'] = stat.st_size
                    return saved_file, info
                else:
                    self.cleanup_file(saved_file)
            
            return None, None
        except Exception as e:
            logger.error(f"Error during media download execution: {e}")
            # Ensure partial residuals are clean
            self._cleanup_matching_id(unique_id)
            return None, None

    def _run_download(self, url: str, opts: Dict[str, Any]) -> Dict[str, Any]:
        with yt_dlp.YoutubeDL(opts) as ydl:
            return ydl.extract_info(url, download=True)

    def cleanup_file(self, filepath: str):
        """Safely removes a file coordinate while protecting against path traversals."""
        if not filepath:
            return
        
        # Security sanity: must be inside download directory prefix
        canonical_path = os.path.realpath(filepath)
        canonical_dir = os.path.realpath(self.download_dir)
        
        if not canonical_path.startswith(canonical_dir):
            logger.error(f"Security Warning: Attempted path traversal deletion for file {filepath}")
            return

        try:
            if os.path.exists(canonical_path):
                os.remove(canonical_path)
                logger.info(f"Successfully cleaned temporary file: {canonical_path}")
        except Exception as e:
            logger.error(f"Failed to cleanup temp file {filepath}: {e}")

    def _cleanup_matching_id(self, unique_id: str):
        """Scrape working dir for leftover part logs or partial streams."""
        try:
            for filename in os.listdir(self.download_dir):
                if filename.startswith(unique_id):
                    full_p = os.path.join(self.download_dir, filename)
                    if os.path.exists(full_p):
                        os.remove(full_p)
        except Exception as e:
            logger.error(f"Error sweeping residual ID files {unique_id}: {e}")
