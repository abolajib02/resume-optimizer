from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    # Accepts either a JSON array string '["https://x.com"]'
    # or a comma-separated string "https://x.com,https://y.com"
    # so it's easy to set in both local .env files and hosting dashboards.
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    max_upload_size_mb: int = 10

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors(cls, v: object) -> object:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                import json

                return json.loads(v)
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
