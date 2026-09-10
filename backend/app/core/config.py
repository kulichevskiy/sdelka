from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://crm:crm@localhost:5432/crm"
    secret_key: str = "dev-secret"
    app_url: str = "http://localhost:8080"
    debug: bool = False

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "Сделка <noreply@sdelka.app>"

    session_ttl_days: int = 30
    invite_ttl_days: int = 14
    reset_ttl_hours: int = 2

    @property
    def cookie_secure(self) -> bool:
        return self.app_url.startswith("https://")

    @property
    def mail_enabled(self) -> bool:
        return bool(self.smtp_host)


@lru_cache
def get_settings() -> Settings:
    return Settings()
