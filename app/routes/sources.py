from flask import Blueprint, request, jsonify
from app import db
from app.models.source import Source
from app.utils.auth_helpers import role_required

sources_bp = Blueprint("sources", __name__)


@sources_bp.route("/", methods=["GET"])
def get_sources():
    """Get all active news sources, optionally filtered by country."""
    country = request.args.get("country")
    query = Source.query.filter_by(is_active=True)

    if country:
        query = query.filter_by(country=country)

    sources = query.order_by(Source.name).all()
    return jsonify([s.to_dict() for s in sources]), 200


@sources_bp.route("/<int:source_id>", methods=["GET"])
def get_source(source_id):
    """Get a single source by ID."""
    source = Source.query.get_or_404(source_id)
    return jsonify(source.to_dict()), 200


@sources_bp.route("/", methods=["POST"])
@role_required("admin")
def create_source():
    """Create a new news source (admin only)."""
    data = request.get_json()

    required = ["name", "domain", "country"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"'{field}' is required"}), 400

    if Source.query.filter_by(domain=data["domain"]).first():
        return jsonify({"error": "A source with this domain already exists"}), 409

    bias_score = data.get("bias_score", 0.0)
    if not isinstance(bias_score, (int, float)) or not (-1.0 <= bias_score <= 1.0):
        return jsonify({"error": "bias_score must be a float between -1.0 and 1.0"}), 400

    source = Source(
        name=data["name"],
        domain=data["domain"],
        country=data["country"],
        bias_score=bias_score,
        description=data.get("description"),
        logo_url=data.get("logo_url"),
    )
    db.session.add(source)
    db.session.commit()

    return jsonify(source.to_dict()), 201


@sources_bp.route("/<int:source_id>", methods=["PUT"])
@role_required("admin")
def update_source(source_id):
    """Update a source's details or bias score (admin only)."""
    source = Source.query.get_or_404(source_id)
    data = request.get_json()

    if "bias_score" in data:
        bias_score = data["bias_score"]
        if not isinstance(bias_score, (int, float)) or not (-1.0 <= bias_score <= 1.0):
            return jsonify({"error": "bias_score must be a float between -1.0 and 1.0"}), 400
        source.bias_score = bias_score

    updatable = ["name", "description", "logo_url", "is_active", "country"]
    for field in updatable:
        if field in data:
            setattr(source, field, data[field])

    db.session.commit()
    return jsonify(source.to_dict()), 200


@sources_bp.route("/<int:source_id>", methods=["DELETE"])
@role_required("admin")
def delete_source(source_id):
    """Soft-delete a source (admin only)."""
    source = Source.query.get_or_404(source_id)
    source.is_active = False
    db.session.commit()
    return jsonify({"message": "Source deactivated"}), 200


@sources_bp.route("/spectrum", methods=["GET"])
def get_bias_spectrum():
    """
    Return all active sources grouped by bias label.
    Used to render the media bias spectrum on the frontend.
    """
    sources = Source.query.filter_by(is_active=True).order_by(Source.bias_score).all()

    spectrum = {
        "far_left": [],
        "left": [],
        "center": [],
        "right": [],
        "far_right": [],
    }

    label_map = {
        "Far Left": "far_left",
        "Left": "left",
        "Center": "center",
        "Right": "right",
        "Far Right": "far_right",
    }

    for source in sources:
        key = label_map.get(source.bias_label, "center")
        spectrum[key].append(source.to_dict())

    return jsonify(spectrum), 200
