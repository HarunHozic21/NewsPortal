from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.article import Article
from app.models.saved_article import SavedArticle
from app.utils.auth_helpers import role_required
from app.models.comment import Comment

articles_bp = Blueprint("articles", __name__)


# ─── Public Endpoints ────────────────────────────────────────────────────────


@articles_bp.route("/", methods=["GET"])
def get_articles():
    """
    Get paginated list of articles.
    Query params: page, per_page, country, language, category, search, bias_min, bias_max
    """
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    country = request.args.get("country")
    language = request.args.get("language")
    category_slug = request.args.get("category")
    search = request.args.get("search")
    bias_min = request.args.get("bias_min", type=float)
    bias_max = request.args.get("bias_max", type=float)

    query = Article.query.filter_by(is_active=True)

    # Filter by source country
    if country:
        query = query.join(Article.source).filter_by(country=country)

    # Filter by language
    if language:
        query = query.filter(Article.language == language)

    # Filter by category
    if category_slug:
        query = query.join(Article.categories).filter_by(slug=category_slug)

    # Filter by bias range (requires joining source)
    if bias_min is not None or bias_max is not None:
        query = query.join(Article.source)
        if bias_min is not None:
            query = query.filter(Article.source.has(bias_score=None) == False)
            from app.models.source import Source

            query = query.filter(Source.bias_score >= bias_min)
        if bias_max is not None:
            from app.models.source import Source

            query = query.filter(Source.bias_score <= bias_max)

    # Full-text search on title and description
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            db.or_(
                Article.title.ilike(search_term),
                Article.description.ilike(search_term),
            )
        )

    query = query.order_by(Article.published_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return (
        jsonify(
            {
                "articles": [a.to_dict() for a in pagination.items],
                "total": pagination.total,
                "page": pagination.page,
                "pages": pagination.pages,
                "per_page": per_page,
            }
        ),
        200,
    )


@articles_bp.route("/<int:article_id>", methods=["GET"])
def get_article(article_id):
    """Get a single article by ID."""
    article = Article.query.filter_by(id=article_id, is_active=True).first_or_404()
    return jsonify(article.to_dict()), 200


# ─── Admin Endpoints ─────────────────────────────────────────────────────────


@articles_bp.route("/", methods=["POST"])
@role_required("admin", "editor")
def create_article():
    """Manually create an article (admin/editor only)."""
    data = request.get_json()

    required = ["title", "url"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"'{field}' is required"}), 400

    article = Article(
        title=data["title"],
        description=data.get("description"),
        content=data.get("content"),
        url=data["url"],
        image_url=data.get("image_url"),
        language=data.get("language"),
        source_id=data.get("source_id"),
    )
    db.session.add(article)
    db.session.commit()

    return jsonify(article.to_dict()), 201


@articles_bp.route("/<int:article_id>", methods=["PUT"])
@role_required("admin", "editor")
def update_article(article_id):
    """Update an article (admin/editor only)."""
    article = Article.query.get_or_404(article_id)
    data = request.get_json()

    updatable = [
        "title",
        "description",
        "content",
        "image_url",
        "is_active",
        "source_id",
    ]
    for field in updatable:
        if field in data:
            setattr(article, field, data[field])

    db.session.commit()
    return jsonify(article.to_dict()), 200


@articles_bp.route("/<int:article_id>", methods=["DELETE"])
@role_required("admin")
def delete_article(article_id):
    """Soft-delete an article (admin only)."""
    article = Article.query.get_or_404(article_id)
    article.is_active = False
    db.session.commit()
    return jsonify({"message": "Article deleted"}), 200


# ─── Saved Articles (Authenticated Readers) ──────────────────────────────────


@articles_bp.route("/<int:article_id>/save", methods=["POST"])
@jwt_required()
def save_article(article_id):
    """Bookmark an article for the current user."""
    user_id = int(get_jwt_identity())
    article = Article.query.get_or_404(article_id)

    existing = SavedArticle.query.filter_by(
        user_id=user_id, article_id=article_id
    ).first()
    if existing:
        return jsonify({"message": "Article already saved"}), 200

    saved = SavedArticle(user_id=user_id, article_id=article_id)
    db.session.add(saved)
    db.session.commit()

    return jsonify({"message": "Article saved"}), 201


@articles_bp.route("/<int:article_id>/save", methods=["DELETE"])
@jwt_required()
def unsave_article(article_id):
    """Remove a bookmarked article for the current user."""
    user_id = int(get_jwt_identity())
    saved = SavedArticle.query.filter_by(
        user_id=user_id, article_id=article_id
    ).first_or_404()
    db.session.delete(saved)
    db.session.commit()
    return jsonify({"message": "Article unsaved"}), 200


@articles_bp.route("/saved", methods=["GET"])
@jwt_required()
def get_saved_articles():
    """Get all articles saved by the current user."""
    user_id = int(get_jwt_identity())
    saved = (
        SavedArticle.query.filter_by(user_id=user_id)
        .order_by(SavedArticle.saved_at.desc())
        .all()
    )
    return jsonify([s.to_dict() for s in saved]), 200


@articles_bp.route("/<int:article_id>/comments", methods=["GET"])
def get_comments(article_id):
    comments = (
        Comment.query.filter_by(article_id=article_id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    return jsonify([c.to_dict() for c in comments]), 200


@articles_bp.route("/<int:article_id>/comments", methods=["POST"])
@jwt_required()
def post_comment(article_id):
    user_id = int(get_jwt_identity())
    data = request.get_json()
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"message": "Comment cannot be empty"}), 400
    comment = Comment(article_id=article_id, user_id=user_id, text=text)
    db.session.add(comment)
    db.session.commit()
    return jsonify(comment.to_dict()), 201
