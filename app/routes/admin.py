from flask import Blueprint, request, jsonify
from app import db
from app.models.user import User
from app.models.article import Article
from app.models.source import Source
from app.utils.auth_helpers import role_required

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/users", methods=["GET"])
@role_required("admin")
def list_users():
    role = request.args.get("role")
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    query = User.query
    if role:
        query = query.filter_by(role=role)
    pagination = query.order_by(User.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({"users": [u.to_dict() for u in pagination.items], "total": pagination.total, "page": pagination.page, "pages": pagination.pages}), 200


@admin_bp.route("/users/<int:user_id>", methods=["PUT"])
@role_required("admin")
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    if "role" in data:
        allowed = ["reader", "writer", "editor", "admin"]
        if data["role"] not in allowed:
            return jsonify({"error": f"Invalid role. Must be one of: {allowed}"}), 400
        user.role = data["role"]
    if "is_active" in data:
        user.is_active = bool(data["is_active"])
    db.session.commit()
    return jsonify(user.to_dict()), 200


@admin_bp.route("/users/<int:user_id>", methods=["DELETE"])
@role_required("admin")
def deactivate_user(user_id):
    user = User.query.get_or_404(user_id)
    user.is_active = False
    db.session.commit()
    return jsonify({"message": "User deactivated"}), 200


@admin_bp.route("/articles", methods=["GET"])
@role_required("admin", "editor", "writer")
def list_all_articles():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    status = request.args.get("status")
    query = Article.query
    if status == "active":
        query = query.filter_by(is_active=True)
    elif status == "inactive":
        query = query.filter_by(is_active=False)
    pagination = query.order_by(Article.published_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({"articles": [a.to_dict() for a in pagination.items], "total": pagination.total, "page": pagination.page, "pages": pagination.pages}), 200


@admin_bp.route("/articles/<int:article_id>/approve", methods=["POST"])
@role_required("admin", "editor")
def approve_article(article_id):
    article = Article.query.get_or_404(article_id)
    article.is_active = True
    db.session.commit()
    return jsonify({"message": "Article approved", "article": article.to_dict()}), 200


@admin_bp.route("/articles/<int:article_id>/reject", methods=["POST"])
@role_required("admin", "editor")
def reject_article(article_id):
    article = Article.query.get_or_404(article_id)
    article.is_active = False
    db.session.commit()
    return jsonify({"message": "Article rejected"}), 200


@admin_bp.route("/stats", methods=["GET"])
@role_required("admin", "editor")
def get_stats():
    total_users = User.query.count()
    total_articles = Article.query.filter_by(is_active=True).count()
    total_sources = Source.query.filter_by(is_active=True).count()
    pending_articles = Article.query.filter_by(is_active=False).count()
    role_counts = {role: User.query.filter_by(role=role).count() for role in ["reader", "writer", "editor", "admin"]}
    return jsonify({"total_users": total_users, "total_articles": total_articles, "total_sources": total_sources, "pending_articles": pending_articles, "users_by_role": role_counts}), 200


@admin_bp.route("/fetch-news", methods=["POST"])
@role_required("admin")
def trigger_fetch():
    from flask import current_app
    from app.services.newsdataapi_service import fetch_and_store_articles
    from app.config import Config
    api_key = Config.NEWSDATA_API_KEY
    if not api_key:
        return jsonify({"error": "NEWSDATA_API_KEY not configured"}), 500
    try:
        count = fetch_and_store_articles(current_app._get_current_object(), api_key=api_key, countries=Config.NEWSDATA_COUNTRIES, languages=Config.NEWSDATA_LANGUAGES)
        return jsonify({"message": f"Fetched and stored {count} new articles", "count": count}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/reset-articles", methods=["POST"])
@role_required("admin")
def reset_articles():
    Article.query.delete()
    db.session.commit()
    return jsonify({"message": "All articles deleted"}), 200

@admin_bp.route("/reset-articles", methods=["POST"])
@role_required("admin")
def reset_articles():
    db.session.execute(db.text("DELETE FROM article_categories"))
    db.session.execute(db.text("DELETE FROM comments"))
    db.session.execute(db.text("DELETE FROM saved_articles"))
    Article.query.delete()
    db.session.commit()
    return jsonify({"message": "All articles deleted"}), 200