from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flask_cors import CORS

from app.config import config

db = SQLAlchemy()
migrate = Migrate()
bcrypt = Bcrypt()
jwt = JWTManager()


def create_app(config_name="default"):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    jwt.init_app(app)
    CORS(app)

    from app.routes.auth import auth_bp
    from app.routes.articles import articles_bp
    from app.routes.sources import sources_bp
    from app.routes.categories import categories_bp
    from app.routes.admin import admin_bp
    from app.routes.writer import writer_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(articles_bp, url_prefix="/api/articles")
    app.register_blueprint(sources_bp, url_prefix="/api/sources")
    app.register_blueprint(categories_bp, url_prefix="/api/categories")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(writer_bp, url_prefix="/api/writer")

    @app.route('/')
    def index():
        return send_from_directory('../frontend', 'index.html')

    @app.route('/<path:path>')
    def static_files(path):
        return send_from_directory('../frontend', path)

    return app