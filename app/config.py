"""
Centralized application configuration.
All values are read from environment variables (see .env.example).
No secrets are hardcoded anywhere in this file.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- App ---
    APP_NAME: str = "Enterprise Intelligence Platform API"
    ENVIRONMENT: str = "development"  # development | production
    API_PREFIX: str = "/api/v1"

    # --- Database ---
    # Defaults to a local SQLite file for zero-config local development.
    # Set DATABASE_URL to a Postgres URL (e.g. Neon) for production.
    DATABASE_URL: str = "sqlite:///./app.db"

    # --- Auth / JWT ---
    SECRET_KEY: str  # REQUIRED. Must be set via environment variable, no default.
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # --- CORS ---
    # Comma-separated list of allowed frontend origins.
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # --- AI Assistant (Groq) ---
    # Optional. If unset, the assistant falls back to a templated
    # (non-LLM) response so the API still works with zero external keys.
    GROQ_API_KEY: str | None = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
