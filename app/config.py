import os
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", "postgresql://localhost/news_portal_db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    NEWSDATA_API_KEY = os.getenv("NEWSDATA_API_KEY")

    # Countries and languages for NewsDataAPI
    NEWSDATA_COUNTRIES = "ba,rs,hr,mk,me,si,al"  # Kosovo (xk) not always supported
    NEWSDATA_LANGUAGES = (
        "bs,hr,sr,en,sq"  # Bosnian, Croatian, Serbian, English, Albanian
    )


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
