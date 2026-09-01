import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "TowerTech Society Management API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Security / JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "towertech-super-secret-key-2026-production-ready")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Supabase Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", os.getenv("VITE_SUPABASE_URL", "https://mniarauxuzqcmdrplgiz.supabase.co"))
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", os.getenv("VITE_SUPABASE_ANON_KEY", "sb_publishable_lyGIIhz89nFb_vMNQVfLCA_HvJeEk_5"))
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # Database URL if direct PostgreSQL connection is provided
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
