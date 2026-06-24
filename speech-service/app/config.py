from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    host: str = "0.0.0.0"
    port: int = 8000
    model_size: str = "base.en"
    device: str = "cpu"
    compute_type: str = "int8"
    download_root: str = ""
    max_audio_seconds: int = 300
    log_level: str = "info"

    model_config = {"env_prefix": "STT_"}


settings = Settings()
