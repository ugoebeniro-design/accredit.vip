from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    APP_NAME: str = "Accredit.vip API"
    DEBUG: bool = True
    DATABASE_URL: str = "sqlite+aiosqlite:///./accredit.db"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    SESSION_IDLE_TIMEOUT_MINUTES: int = 30  # idle timeout on frontend
    REDIS_URL: str = "redis://localhost:6379/0"
    STORAGE_BUCKET: str = "accredit"
    STORAGE_ENDPOINT: str = ""
    STORAGE_KEY: str = ""
    STORAGE_SECRET: str = ""
    PAYSTACK_SECRET_KEY: str = ""
    PAYSTACK_PUBLIC_KEY: str = ""
    FLUTTERWAVE_SECRET_KEY: str = ""
    OPENAI_API_KEY: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_FROM: str = ""
    WHATSAPP_CLOUD_TOKEN: str = ""
    WHATSAPP_CLOUD_PHONE_ID: str = ""
    SMTP_HOST: str = ""
    SMTP_PORT: int = 465
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "Accredit.vip <invites@accredit.vip>"
    RESEND_API_KEY: str = ""
    SENDGRID_API_KEY: str = ""
    SENDGRID_FROM_EMAIL: str = "Accredit.vip <invites@accredit.vip>"
    TERMII_API_KEY: str = ""
    AFRICASTALKING_API_KEY: str = ""
    AFRICASTALKING_USERNAME: str = ""

    PLATFORM_FEE_PERCENT: float = 5.0
    VAT_PERCENT: float = 2.5

    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
