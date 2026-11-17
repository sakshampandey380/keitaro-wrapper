import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/keitaro_wrapper"
    KEITARO_API_URL: str = "https://tlgk.host/admin_api/v1"
    KEITARO_API_KEY: str = "5149af94ff5da95812b918f31569d498"
    DEFAULT_DOMAIN_NAME: str = "in.posdk.xyz"
    DEFAULT_GROUP_NAME: str = "FORTESTS"
    DEFAULT_SOURCE_NAME: str = "FORTESTS"
    CAMPAIGN_PREFIX: str = "test_pandey_"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
