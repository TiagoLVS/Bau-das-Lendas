from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore', hide_input_in_errors=True)

    database_url: str
    app_env: Literal['production', 'development', 'test'] = 'production'
    jwt_secret: str = Field(min_length=32)
    session_minutes: int = Field(default=120, ge=1, le=10080)
    cookie_secure: bool = True
    allowed_origins: list[str] = ['http://localhost:5175', 'http://127.0.0.1:5175']
    rate_login_limit: int = Field(default=20, ge=1, le=10000)
    rate_register_limit: int = Field(default=10, ge=1, le=10000)
    rate_draw_limit: int = Field(default=120, ge=1, le=10000)
    rate_window_seconds: int = Field(default=60, ge=1, le=86400)
    rate_login_failure_limit: int = Field(default=8, ge=1, le=10000)
    rate_login_failure_window_seconds: int = Field(default=300, ge=1, le=86400)
    catalog_path: Path = Path(__file__).resolve().parents[3] / 'public/lendas-ra.json'

    @model_validator(mode='after')
    def validate_origins(self):
        if 'SUBSTITUA' in self.jwt_secret.upper():
            raise ValueError('Substitua JWT_SECRET por um segredo aleatório.')
        if not self.allowed_origins or any(o == '*' or o.endswith('/') for o in self.allowed_origins):
            raise ValueError('Defina origens explícitas, sem barra final.')
        if self.app_env == 'production':
            if not self.database_url.startswith(('postgresql://', 'postgresql+psycopg://')):
                raise ValueError('Produção exige PostgreSQL.')
            if not self.cookie_secure:
                raise ValueError('Produção exige cookies Secure.')
            if any(not origin.startswith('https://') for origin in self.allowed_origins):
                raise ValueError('Produção exige origens HTTPS explícitas.')
        return self


@lru_cache
def get_settings():
    return Settings()
