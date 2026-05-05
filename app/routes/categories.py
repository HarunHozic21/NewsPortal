from flask import Blueprint, request, jsonify
from app import db
from app.models.category import Category
from app.utils.auth_helpers import role_required

categories_bp = Blueprint("categories", __name__)


@categories_bp.route("/", methods=["GET"])
def get_categories():
    """Return all categories."""
    categories = Category.query.order_by(Category.name).all()
    return jsonify([c.to_dict() for c in categories]), 200


@categories_bp.route("/", methods=["POST"])
@role_required("admin")
def create_category():
    """Create a new category (admin only)."""
    data = request.get_json()

    if not data.get("name") or not data.get("slug"):
        return jsonify({"error": "'name' and 'slug' are required"}), 400

    if Category.query.filter_by(slug=data["slug"]).first():
        return jsonify({"error": "Category with this slug already exists"}), 409

    category = Category(name=data["name"], slug=data["slug"])
    db.session.add(category)
    db.session.commit()

    return jsonify(category.to_dict()), 201


@categories_bp.route("/<int:category_id>", methods=["DELETE"])
@role_required("admin")
def delete_category(category_id):
    """Delete a category (admin only)."""
    category = Category.query.get_or_404(category_id)
    db.session.delete(category)
    db.session.commit()
    return jsonify({"message": "Category deleted"}), 200
