from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Relationship Intelligence Platform"
    DEBUG: bool = True
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    DATABASE_URL: str = ""
    FRONTEND_URL: str = "http://localhost:5173"
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()