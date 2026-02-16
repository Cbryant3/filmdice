from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    tmdb_api_key: str    
    tmdb_auth_mode: str = "v4"  # "v3" or "v4"

settings = Settings()
