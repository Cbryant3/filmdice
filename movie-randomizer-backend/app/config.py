from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    tmdb_api_key: str
    tmdb_auth_mode: str = "v4"  # "v3" or "v4"
    database_url: str
    # Comma-separated list of frontend origins allowed to call this API.
    # Defaults to the live site plus local dev. Set ALLOWED_ORIGINS="*" to allow
    # any origin (e.g. testing from a phone on your LAN).
    allowed_origins: str = (
        "https://filmdice-bay.vercel.app,"
        "http://localhost:3000,"
        "http://127.0.0.1:3000"
    )
    # Also allow Vercel preview deployments of this project.
    allowed_origin_regex: str = r"^https://filmdice-[a-z0-9-]+-cameron-b\.vercel\.app$"

    @property
    def cors_origins(self) -> list[str]:
        """Parsed, de-duplicated list of allowed origins for the CORS middleware."""
        raw = [o.strip().rstrip("/") for o in self.allowed_origins.split(",")]
        return [o for o in raw if o]

settings = Settings()
