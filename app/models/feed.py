from app import db
from datetime import datetime, timezone


class Feed(db.Model):
    __tablename__ = "feeds"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    preferred_countries = db.Column(db.String(100), nullable=True)   # e.g. "ba,rs,hr"
    preferred_categories = db.Column(db.String(200), nullable=True)  # e.g. "politics,economy"
    notifications_enabled = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationship
    user = db.relationship("User", back_populates="feed")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "preferred_countries": self.preferred_countries.split(",") if self.preferred_countries else [],
            "preferred_categories": self.preferred_categories.split(",") if self.preferred_categories else [],
            "notifications_enabled": self.notifications_enabled,
        }

    def __repr__(self):
        return f"<Feed user={self.user_id}>"