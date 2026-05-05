from app import db
from datetime import datetime, timezone


class Source(db.Model):
    __tablename__ = "sources"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    domain = db.Column(db.String(100), unique=True, nullable=False)  # e.g. "klix.ba"
    country = db.Column(db.String(50), nullable=False)                # e.g. "ba", "rs", "hr"
    # Bias score: -1.0 = far left, 0.0 = center, 1.0 = far right
    bias_score = db.Column(db.Float, nullable=False, default=0.0)
    description = db.Column(db.Text, nullable=True)
    logo_url = db.Column(db.String(255), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    articles = db.relationship("Article", back_populates="source", lazy="dynamic")

    @property
    def bias_label(self):
        """Return a human-readable bias label based on the score."""
        if self.bias_score <= -0.6:
            return "Far Left"
        elif self.bias_score <= -0.2:
            return "Left"
        elif self.bias_score < 0.2:
            return "Center"
        elif self.bias_score < 0.6:
            return "Right"
        else:
            return "Far Right"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "domain": self.domain,
            "country": self.country,
            "bias_score": self.bias_score,
            "bias_label": self.bias_label,
            "description": self.description,
            "logo_url": self.logo_url,
            "is_active": self.is_active,
        }

    def __repr__(self):
        return f"<Source {self.name} ({self.country}) bias={self.bias_score}>"
