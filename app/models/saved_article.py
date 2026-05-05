from app import db
from datetime import datetime, timezone


class SavedArticle(db.Model):
    __tablename__ = "saved_articles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    article_id = db.Column(db.Integer, db.ForeignKey("articles.id"), nullable=False)
    saved_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Ensure a user can't save the same article twice
    __table_args__ = (db.UniqueConstraint("user_id", "article_id", name="uq_user_article"),)

    # Relationships
    user = db.relationship("User", back_populates="saved_articles")
    article = db.relationship("Article", back_populates="saved_by")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "article": self.article.to_dict(),
            "saved_at": self.saved_at.isoformat(),
        }

    def __repr__(self):
        return f"<SavedArticle user={self.user_id} article={self.article_id}>"
