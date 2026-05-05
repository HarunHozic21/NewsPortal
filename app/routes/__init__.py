from app.routes.auth import auth_bp
from app.routes.articles import articles_bp
from app.routes.sources import sources_bp
from app.routes.categories import categories_bp

__all__ = ["auth_bp", "articles_bp", "sources_bp", "categories_bp"]
