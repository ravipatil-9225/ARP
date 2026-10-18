from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Literal


class Settings(BaseSettings):
    # App
    APP_NAME: str = "PrismHire AI"
    APP_ENV: Literal["development", "production"] = "development"
    DEBUG: bool = True
    FRONTEND_URL: str = "http://localhost:5173"

    # MongoDB
    MONGODB_URI: str = "mongodb+srv://demo:demo@cluster0.mongodb.net/?retryWrites=true&w=majority"
    MONGODB_DB_NAME: str = "smarthire"

    # JWT
    JWT_SECRET_KEY: str = "smarthire-super-secret-jwt-key-2025-production-grade"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # AI
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    PRIMARY_AI_PROVIDER: Literal["gemini", "openai"] = "gemini"

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    EMAIL_FROM_NAME: str = "PrismHire AI"

    # Storage
    STORAGE_BACKEND: Literal["local", "s3"] = "local"
    LOCAL_UPLOAD_DIR: str = "./uploads"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = ""
    AWS_REGION: str = "ap-south-1"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Base URL
    BASE_URL: str = "http://localhost:8000"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
