import os
import logging
import httpx
import json
import uuid
import time
from typing import Dict, Any, Optional, Tuple

try:
    from backend_python.config import settings
    from backend_python.db import DatabaseManager
    from backend_python.downloader import DownloadEngine
except ImportError:
    from config import settings
    from db import DatabaseManager
    from downloader import DownloadEngine

logger = logging.getLogger("downloader.bot")

class TelegramBot:
    """
    Production-grade Telegram Bot Hook handler using direct async HTTPS interactions.
    Saves RAM overhead compared to heavy libraries, runs asynchronously, 
    and guarantees strict compliance with Google Cloud Run scaling standards.
    """
    def __init__(self, db: DatabaseManager, engine: DownloadEngine):
        self.db = db
        self.engine = engine
        self.api_url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}"
        self.http_client = httpx.AsyncClient(timeout=30.0)

    async def initialize_webhook(self) -> bool:
        """Sets up the secure webhook in Telegram."""
        url = f"{self.api_url}/setWebhook"
        payload = {
            "url": settings.WEBHOOK_URL,
            "secret_token": settings.SECRET_TOKEN,
            "allowed_updates": ["message", "callback_query"]
        }
        try:
            resp = await self.http_client.post(url, json=payload)
            result = resp.json()
            logger.info(f"Webhook initialization result: {result}")
            return result.get("ok", False)
        except Exception as e:
            logger.error(f"Failed to set Telegram webhook: {e}")
            return False

    async def handle_update(self, update: Dict[str, Any]) -> Dict[str, Any]:
        """Main router parsing incoming updates (Messages & Inline Button Clicks)"""
        if "message" in update:
            await self._handle_message(update["message"])
        elif "callback_query" in update:
            await self._handle_callback(update["callback_query"])
        return {"status": "processed"}

    async def _handle_message(self, msg: Dict[str, Any]):
        chat = msg.get("chat", {})
        chat_id = chat.get("id")
        text = msg.get("text", "").strip()
        user = msg.get("from", {})
        user_id = user.get("id")
        username = user.get("username")
        first_name = user.get("first_name", "User")

        if not chat_id or not user_id:
            return

        # 1. Register User in DB
        self.db.register_user(user_id, username, user.get("language_code", "ar"))

        # 2. Command Handlers
        if text.startswith("/"):
            await self._handle_command(chat_id, user_id, text, first_name)
            return

        # 3. Handle Media Download URLs
        platform, supported = self.engine.extract_platform(text)
        if not supported:
            # If standard message but not a URL, return prompt helper in Arabic
            if text.startswith("http"):
                await self._send_text(chat_id, "❌ هذا الرابط غير مدعوم أو عبارة عن قائمة تشغيل. ندعم روابط يوتيوب، تيك توك، إنستغرام وفيسبوك الفردية.")
            else:
                await self._send_text(chat_id, "👋 أرسل لي رابط فيديو من يوتيوب، تيك توك، إنستغرام أو فيسبوك، وسأقوم بتحميله فوراً!")
            return

        # 4. Enforce Anti-Spam Rate Limits
        allowed, wait_sec = self.db.check_rate_limit(user_id, settings.RATE_LIMIT_COOLDOWN_SEC)
        if not allowed:
            await self._send_text(
                chat_id, 
                f"⚠️ يرجى الانتظار {wait_sec} ثانية قبل طلب تحميل فيديو آخر حفاظاً على موارد الخادم."
            )
            return

        # 5. Extract Metadata / Loading Indicator
        status_msg_id = await self._send_text(chat_id, "⏳ جاري جلب معلومات الفيديو والتحقق من الجودة المتاحة...")
        if not status_msg_id:
            return

        metadata = await self.engine.extract_metadata(text)
        if not metadata:
            await self._edit_text(chat_id, status_msg_id, "❌ تعذر استخراج بيانات هذا الفيديو. تأكد من أن الرابط عام ويعمل.")
            return

        # Verify estimated sizes
        duration = metadata.get("duration", 0) or 0
        title = metadata.get("title", "Video")[:80] # Trim title
        
        # Save URL to persistent DB store with short ID to bypass Telegram's 64-byte callback size limit
        short_id = str(uuid.uuid4())[:8]
        # Store in db using our cache table
        with self.db._get_connection() as conn:
            conn.execute(
                "INSERT INTO metadata_cache (url_hash, title, file_size, best_format_url) VALUES (?, ?, ?, ?)",
                (short_id, title[:100], "unknown", text)
            )
            conn.commit()

        # Send Quality Selector Interactive Buttons
        keyboard = {
            "inline_keyboard": [
                [
                    {"text": "🎬 أفضل جودة (Best)", "callback_data": f"dl|best|{short_id}"},
                    {"text": "🖥️ 1080p", "callback_data": f"dl|1080p|{short_id}"}
                ],
                [
                    {"text": "📺 720p", "callback_data": f"dl|720p|{short_id}"},
                    {"text": "📱 480p", "callback_data": f"dl|480p|{short_id}"}
                ],
                [
                    {"text": "🎵 ملف صوتي MP3", "callback_data": f"dl|mp3|{short_id}"}
                ]
            ]
        }
        
        await self._edit_text(
            chat_id, 
            status_msg_id, 
            f"📥 **تم العثور على الفيديو!**\n\n📌 العنوان: {title}\n⏱️ المدة: {int(duration)} ثانية\n\nاختر الصيغة أو الجودة المطلوبة للتحميل:",
            reply_markup=keyboard
        )

    async def _handle_callback(self, callback: Dict[str, Any]):
        chat_id = callback.get("message", {}).get("chat", {}).get("id")
        msg_id = callback.get("message", {}).get("message_id")
        user_id = callback.get("from", {}).get("id")
        data = callback.get("data", "")

        if not chat_id or not msg_id or not user_id:
            return

        # Pattern matching formatting callback: dl|<quality>|<short_id>
        if not data.startswith("dl|"):
            return

        # Trigger quick callback acknowledgement loading spinner
        await self._answer_callback(callback.get("id"))

        _, quality, short_id = data.split("|")
        
        # Retrieve target URL using short_id lookup
        original_url = None
        title = "Video"
        with self.db._get_connection() as conn:
            row = conn.execute("SELECT best_format_url, title FROM metadata_cache WHERE url_hash = ?", (short_id,)).fetchone()
            if row:
                original_url = row[0]
                title = row[1]
        
        if not original_url:
            await self._edit_text(chat_id, msg_id, "❌ عذراً، انتهت صلاحية هذا الطلب. يرجى إرسال الرابط من جديد.")
            return

        # Start Async Pipeline execution
        await self._edit_text(chat_id, msg_id, f"📥 **جاري تحميل الفيديو...**\n📌 {title}\n⚙️ الجودة المفضلة: {quality.upper()}")
        
        t_start = time.time()

        # Update user's last request time in database before starting download
        self.db.register_user(user_id)

        filepath, info = await self.engine.download_media(original_url, quality)
        elapsed = time.time() - t_start

        if not filepath:
            await self._edit_text(chat_id, msg_id, f"❌ **تعذر تحميل الفيديو**\nتجاوز الحجم المسموح به (50MB) أو حدثت مشكلة أثناء المعالجة أو الرابط غير صالح.")
            self.db.log_download(str(uuid.uuid4()), user_id, "unknown", original_url, "0MB", "failed", elapsed, "Download execution failure")
            return

        # Read actual file size before any deletion or sending
        file_size_bytes = os.path.getsize(filepath) if os.path.exists(filepath) else 0
        file_size_mb = file_size_bytes / (1024 * 1024)
        file_size_str = f"{file_size_mb:.2f} MB"

        try:
            # Update state to Send to Telegram
            await self._edit_text(chat_id, msg_id, "📤 **جاري إرسال الملف إلى تيليجرام...**")

            caption = f"✅ تم تحميل الفيديو بنجاح بواسطة البوت!\n\n📌 {title}\n💾 الحجم: {file_size_str}"
            
            success = False
            error_msg = None
            try:
                if quality == "mp3":
                    success = await self._send_audio(chat_id, filepath, caption)
                else:
                    success = await self._send_video(chat_id, filepath, caption)
            except Exception as e:
                error_msg = str(e)
                logger.error(f"Telegram upload failure: {e}")

            if success:
                await self._delete_message(chat_id, msg_id)
                self.db.log_download(
                    str(uuid.uuid4()), 
                    user_id, 
                    self.engine.extract_platform(original_url)[0], 
                    original_url, 
                    file_size_str, 
                    "completed", 
                    elapsed
                )
            else:
                await self._edit_text(
                    chat_id, 
                    msg_id, 
                    f"❌ **فشل في إرسال الملف لتيليجرام**\n"
                    f"قد يكون حجم الملف كبيراً جداً ({file_size_str}) بالنسبة لقيود المنصة (حد 50MB للملف الواحد)، أو الشبكة ضعيفة."
                )
                self.db.log_download(
                    str(uuid.uuid4()), 
                    user_id, 
                    self.engine.extract_platform(original_url)[0], 
                    original_url, 
                    file_size_str, 
                    "failed", 
                    elapsed, 
                    error_msg or "Telegram upload response error"
                )
        finally:
            # Always clean local storage immediately post-delivery/failure (preventing leak overflows)
            self.engine.cleanup_file(filepath)

    async def _handle_command(self, chat_id: int, user_id: int, command: str, first_name: str):
        if command == "/start":
            welcome_text = (
                f"👋 أهلاً بك يا {first_name} في بوت تحميل الفيديوهات المطور!\n\n"
                "أرسل لي أي رابط من المنصات التالية وسأقوم بتحميله فوراً وبأعلى جودة متاحة:\n"
                "• 🎬 يوتيوب (YouTube & Shorts)\n"
                "• 🎵 تيك توك (TikTok)\n"
                "• 📸 إنستغرام (Instagram Reels)\n"
                "• 👥 فيسبوك (Facebook)\n\n"
                "💡 **ميزات البوت:**\n"
                "⚡ فائق السرعة وبدون إعلانات\n"
                "⚙️ يتيح لك اختيار الجودة المناسبة\n"
                "🎵 إمكانية استخراج الصوت فقط بصيغة MP3"
            )
            await self._send_text(chat_id, welcome_text)
        elif command == "/help":
            help_text = (
                "ℹ️ **كيفية استخدام البوت:**\n\n"
                "1. قم بنسخ رابط الفيديو الذي ترغب بتحميله من أي تطبيق (يوتيوب، تيك توك، إنستغرام، فيسبوك).\n"
                "2. الصق الرابط هنا في المحادثة وأرسله.\n"
                "3. انتظر ثوانٍ لتحليل الرابط، ثم اختر الجودة أو MP3 من الأزرار المتاحة.\n"
                "4. سيقوم البوت بتحميل الفيديو وإرساله لك كملف قابل للتشغيل.\n\n"
                "⚠️ **تنبيه:** الحد الأقصى لحجم الفيديو هو 50 ميجابايت التزاماً بقيود تيليجرام."
            )
            await self._send_text(chat_id, help_text)
        elif command == "/status":
            with self.db._get_connection() as conn:
                row = conn.execute("SELECT COUNT(*) FROM downloads WHERE user_id = ? AND status='completed'", (user_id,)).fetchone()
                user_downloads = row[0] if row else 0
            
            status_text = (
                "📊 **حالة النظام واشتراكك:**\n\n"
                "🟢 الخادم: متصل ويعمل بكفاءة عالية (Online)\n"
                f"📥 تحميلاكت المكتملة: {user_downloads} فيديو\n"
                "🛡️ حد الحماية من السبام: 10 ثوانٍ بين كل طلب تحميل\n"
                "⚡ سرعة التحميل: غير محدودة"
            )
            await self._send_text(chat_id, status_text)
        elif command == "/about":
            about_text = (
                "🤖 **حول هذا البوت:**\n\n"
                "برنامج لتحميل الفيديوهات والملفات الصوتية من شبكات التواصل الاجتماعي بشكل آمن وسريع.\n\n"
                "• الإصدار: 2.1.0-Release\n"
                "• التقنيات المستخدمة: FastAPI / Async Python / yt-dlp / Cloud Run\n"
                "• حماية البيانات: يتم حذف الفيديوهات نهائياً من الخادم مباشرة بعد إرسالها إليك لضمان أعلى مستويات الخصوصية والأمان."
            )
            await self._send_text(chat_id, about_text)

    async def _send_text(self, chat_id: int, text: str, reply_markup: Optional[Dict[str, Any]] = None) -> Optional[int]:
        url = f"{self.api_url}/sendMessage"
        payload = {"chat_id": chat_id, "text": text, "parse_mode": "Markdown"}
        if reply_markup:
            payload["reply_markup"] = reply_markup
            
        try:
            resp = await self.http_client.post(url, json=payload)
            result = resp.json()
            return result.get("result", {}).get("message_id")
        except Exception as e:
            logger.error(f"Error executing sendMessage: {e}")
            return None

    async def _edit_text(self, chat_id: int, message_id: int, text: str, reply_markup: Optional[Dict[str, Any]] = None):
        url = f"{self.api_url}/editMessageText"
        payload = {"chat_id": chat_id, "message_id": message_id, "text": text, "parse_mode": "Markdown"}
        if reply_markup:
            payload["reply_markup"] = reply_markup
            
        try:
            await self.http_client.post(url, json=payload)
        except Exception as e:
            logger.error(f"Error executing editMessageText: {e}")

    async def _delete_message(self, chat_id: int, message_id: int):
        url = f"{self.api_url}/deleteMessage"
        try:
            await self.http_client.post(url, json={"chat_id": chat_id, "message_id": message_id})
        except Exception as e:
            logger.error(f"Error executing deleteMessage: {e}")

    async def _answer_callback(self, callback_query_id: str):
        url = f"{self.api_url}/answerCallbackQuery"
        try:
            await self.http_client.post(url, json={"callback_query_id": callback_query_id})
        except Exception as e:
            logger.error(f"Error answering callback query: {e}")

    async def _send_video(self, chat_id: int, filepath: str, caption: str) -> bool:
        url = f"{self.api_url}/sendVideo"
        try:
            # We open the file asynchronously, but httpx uses standard dict-like upload parameters
            with open(filepath, "rb") as f:
                files = {"video": (os.path.basename(filepath), f, "video/mp4")}
                data = {"chat_id": chat_id, "caption": caption, "supports_streaming": True}
                resp = await self.http_client.post(url, data=data, files=files, timeout=120.0)
                return resp.json().get("ok", False)
        except Exception as e:
            logger.error(f"sendVideo Exception: {e}")
            return False

    async def _send_audio(self, chat_id: int, filepath: str, caption: str) -> bool:
        url = f"{self.api_url}/sendAudio"
        try:
            with open(filepath, "rb") as f:
                files = {"audio": (os.path.basename(filepath), f, "audio/mpeg")}
                data = {"chat_id": chat_id, "caption": caption}
                resp = await self.http_client.post(url, data=data, files=files, timeout=120.0)
                return resp.json().get("ok", False)
        except Exception as e:
            logger.error(f"sendAudio Exception: {e}")
            return False

    async def close(self):
        await self.http_client.aclose()
