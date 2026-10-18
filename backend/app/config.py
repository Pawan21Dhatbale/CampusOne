import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class BaseConfig:
    """Base configuration loaded across all environments."""
    SECRET_KEY = os.getenv("SECRET_KEY", "smartattend-dev-super-secret-key-32charsmin!")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "smartattend-jwt-dev-secret-key-32charsmin!")
    
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        minutes=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES_MINUTES", 120))
    )
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(
        days=int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES_DAYS", 30))
    )
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # CORS
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
        if origin.strip()
    ]

    # Attendance thresholds
    MIN_ATTENDANCE_WARNING_THRESHOLD = float(os.getenv("MIN_ATTENDANCE_WARNING_THRESHOLD", 75.0))
    EXCELLENT_ATTENDANCE_THRESHOLD = float(os.getenv("EXCELLENT_ATTENDANCE_THRESHOLD", 95.0))

    # Allowed Institutional Email Domains
    ALLOWED_EMAIL_DOMAINS = [
        d.strip().lower()
        for d in os.getenv("ALLOWED_EMAIL_DOMAINS", "mitaoe.ac.in,test.edu").split(",")
        if d.strip()
    ]

    # SMTP Configuration
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.getenv("MAIL_PORT", 587))
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "True").lower() in ("true", "1", "yes")
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER", "noreply@college.edu")


    # Supabase Configuration
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def get_normalized_database_url():
    """Formats and normalizes PostgreSQL database URL for Supabase compatibility using psycopg2."""
    url = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@localhost:5432/postgres"
    )
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


class DevelopmentConfig(BaseConfig):
    """Development configuration enforcing PostgreSQL (Supabase)."""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = get_normalized_database_url()
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }


class TestingConfig(BaseConfig):
    """Testing configuration with in-memory SQLite database for fast isolated unit tests."""
    TESTING = True
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    WTF_CSRF_ENABLED = False


class ProductionConfig(BaseConfig):
    """Production configuration enforcing Supabase PostgreSQL."""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = get_normalized_database_url()
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
