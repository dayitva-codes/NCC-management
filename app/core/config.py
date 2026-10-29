from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Active database connection: PostgreSQL (Supabase / Render) or fallback SQLite
    database_url: str = "sqlite:///./ncc.db"

    # Core API Security & JWT
    secret_key: str = "change-this-secret-key-before-any-real-deployment"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 1 day

    # Supabase Cloud Project Configuration
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    # Cross-Origin Resource Sharing (CORS)
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,*"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
