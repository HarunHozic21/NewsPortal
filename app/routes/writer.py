from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from app import db
from app.models.article import Article
from app.utils.auth_helpers import role_required

writer_bp = Blueprint("writer", __name__)


@writer_bp.route("/submit", methods=["POST"])
@role_required("writer", "editor", "admin")
def submit_article():
    data = request.get_json()
    required = ["title", "url"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"'{field}' is required"}), 400
    article = Article(
        title=data["title"],
        description=data.get("description", ""),
        content=data.get("content", ""),
        url=data["url"],
        image_url=data.get("image_url"),
        language=data.get("language", "en"),
        source_id=data.get("source_id"),
        is_active=False,
    )
    db.session.add(article)
    db.session.commit()
    return jsonify({"message": "Article submitted for review", "article": article.to_dict()}), 201


@writer_bp.route("/my-articles", methods=["GET"])
@role_required("writer", "editor", "admin")
def my_articles():
    articles = Article.query.filter_by(is_active=False).order_by(Article.fetched_at.desc()).limit(50).all()
    return jsonify([a.to_dict() for a in articles]), 200
