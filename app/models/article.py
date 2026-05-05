from app import db
from app.models.category import article_categories
from datetime import datetime, timezone


class Article(db.Model):
    __tablename__ = "articles"

    id = db.Column(db.Integer, primary_key=True)
    external_id = db.Column(db.String(255), unique=True, nullable=True)  # NewsDataAPI article_id
    title = db.Column(db.String(500), nullable=False)
    description = db.Column(db.Text, nullable=True)
    content = db.Column(db.Text, nullable=True)
    url = db.Column(db.String(500), nullable=False)
    image_url = db.Column(db.String(500), nullable=True)
    language = db.Column(db.String(50), nullable=True)                    # e.g. "bs", "hr", "sr"
    published_at = db.Column(db.DateTime, nullable=True)
    fetched_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    # Foreign key
    source_id = db.Column(db.Integer, db.ForeignKey("sources.id"), nullable=True)

    # Relationships
    source = db.relationship("Source", back_populates="articles")
    categories = db.relationship(
        "Category",
        secondary=article_categories,
        back_populates="articles",
        lazy="joined",
    )
    saved_by = db.relationship("SavedArticle", back_populates="article", lazy="dynamic")

    def to_dict(self, include_source=True):
        data = {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "url": self.url,
            "image_url": self.image_url,
            "language": self.language,
            "published_at": self.published_at.isoformat() if self.published_at else None,
            "categories": [c.to_dict() for c in self.categories],
        }
        if include_source and self.source:
            data["source"] = self.source.to_dict()
        return data

    def __repr__(self):
        return f"<Article {self.id}: {self.title[:50]}>"
