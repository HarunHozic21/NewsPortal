from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from app.models.user import User


def role_required(*roles):
    """Decorator that restricts access to users with specific roles."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = User.query.get(user_id)

            if not user or not user.is_active:
                return jsonify({"error": "User not found or inactive"}), 403

            if user.role not in roles:
                return jsonify({"error": f"Access denied. Required roles: {list(roles)}"}), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator
