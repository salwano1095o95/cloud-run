import os
from pydantic import Field
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """
    Application configurations and security parameters.
    Secrets are read from environment variables; default values are provided for testing.
    """
    TELEGRAM_BOT_TOKEN: str = Field(
        default="YOUR_DEFAULT_TELEGRAM_TOKEN_HERE",
        description="The API Token provided by @BotFather for the Telegram bot."
    )
    
    WEBHOOK_URL: str = Field(
        default="https://your-cloudrun-service-url.run.app/telegram/webhook",
        description="Public URL pointing to this deployment for Telegram secure webhooks."
    )
    
    SECRET_TOKEN: str = Field(
        default="TelegramSecureWebhookToken123!",
        description="A secure secret token to validate webhook headers and prevent SSRF/malicious webhook requests."
    )
    
    DOWNLOAD_DIR: str = Field(
        default="/tmp/downloads",
        description="Directory for storing temporary video downloads before delivering to Telegram."
    )
    
    MAX_FILE_SIZE_MB: int = Field(
        default=50,
        description="Maximum permissible download file size in MB. Note that non-local bots have a 50MB file upload limit."
    )
    
    RATE_LIMIT_COOLDOWN_SEC: int = Field(
        default=10,
        description="Cooldown duration (seconds) required between download requests per individual user."
    )
    
    MAX_CONCURRENT_DOWNLOADS: int = Field(
        default=5,
        description="Maximum concurrent downloads allowed system-wide to prevent resource exhaustion."
    )
    
    DATABASE_URL: str = Field(
        default="sqlite:////tmp/downloader.db",
        description="Connection string for SQLite database. Ready to change to postgresql:// as scaling demands."
    )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def validate(self):
        token = self.TELEGRAM_BOT_TOKEN
        webhook = self.WEBHOOK_URL
        secret = self.SECRET_TOKEN

        # Check for missing values or placeholder configurations
        if not token or token.strip() == "" or "YOUR_DEFAULT" in token or token == "YOUR_DEFAULT_TELEGRAM_TOKEN_HERE":
            raise ValueError(
                "CRITICAL CONFIGURATION ERROR: TELEGRAM_BOT_TOKEN environment variable is missing, "
                "empty, or using default placeholder. High-security production startups require a real Telegram API Token."
            )

        if not webhook or webhook.strip() == "" or "your-cloudrun" in webhook or webhook == "https://your-cloudrun-service-url.run.app/telegram/webhook":
            raise ValueError(
                "CRITICAL CONFIGURATION ERROR: WEBHOOK_URL environment variable is missing, "
                "empty, or using default placeholder. Secure webhook forwarding requires a valid production URL."
            )

        if not secret or secret.strip() == "" or "TelegramSecureWebhookToken" in secret or secret == "TelegramSecureWebhookToken123!":
            raise ValueError(
                "CRITICAL CONFIGURATION ERROR: SECRET_TOKEN environment variable is missing, "
                "empty, or using default placeholder. Security auditing demands a strong unique security signature."
            )

# Instance configurations
settings = Settings()
settings.validate()

# Ensure temporary files directory exists securely
os.makedirs(settings.DOWNLOAD_DIR, exist_ok=True)
