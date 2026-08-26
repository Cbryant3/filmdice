from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    tmdb_api_key: str
    tmdb_auth_mode: str = "v4"  # "v3" or "v4"
    database_url: str
    # Comma-separated list of allowed frontend origins.
    # Local dev default is permissive; in production set ALLOWED_ORIGINS to your
    # deployed frontend, e.g. "https://filmdice.vercel.app".
    allowed_origins: str = "*"

    @property
    def cors_origins(self) -> list[str]:
        """Parsed, de-duplicated list of allowed origins for the CORS middleware."""
        raw = [o.strip().rstrip("/") for o in self.allowed_origins.split(",")]
        return [o for o in raw if o]

settings = Settings()
