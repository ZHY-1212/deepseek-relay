from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    secret_key: str = "change-me-in-production-use-a-random-secret"
    deepseek_api_key: str = "sk-your-deepseek-api-key"
    data_dir: str = str(Path(__file__).parent.parent / "data")
    admin_email: str = "admin@example.com"
    cors_origins: list[str] = ["*"]


settings = Settings()
