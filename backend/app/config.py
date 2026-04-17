from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    max_upload_size_mb: int = 10

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
