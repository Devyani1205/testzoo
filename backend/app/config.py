from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "TestZoo"
    DEBUG: bool = True

    DB_USER: str = "workspace_user"
    DB_PASS: str = "Suni@123"
    DB_NAME: str = "sonu"
    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 5432

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASS}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    @property
    def DATABASE_URL_SYNC(self) -> str:
        return f"postgresql://{self.DB_USER}:{self.DB_PASS}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    REDIS_URL: str = "redis://localhost:6379"

    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.1-8b-instant"

    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "qwen/qwen3.7-plus"

    SECRET_KEY: str = "your-32-byte-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_NUMBER: str = "whatsapp:+14155238886"

    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""

    FRONTEND_URL: str = "http://localhost:3000"

    # SMTP Email Settings
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    SMTP_FROM: str = "noreply@testzoo.ai"
    SMTP_TLS: bool = True

    PATIENT_DISCOUNT_PERCENT: float = 15.0
    CASHBACK_PERCENT: float = 5.0
    REFERRAL_REWARD_AMOUNT_CENTS: int = 50000
    MAX_SPONSORED_RESULTS: int = 3
    COD_ENABLED: bool = True
    WALLET_ENABLED: bool = True

    MCP_CATALOG_PORT: int = 8001
    MCP_ORDERS_PORT: int = 8002
    MCP_PAYMENT_PORT: int = 8003
    MCP_DASHBOARD_PORT: int = 8004
    MCP_PATIENT_PORT: int = 8005

    class Config:
        env_file = "testzoo.env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
