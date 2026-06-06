from app import db
from datetime import datetime


class Comment(db.Model):
    __tablename__ = "comments"

    id = db.Column(db.Integer, primary_key=True)
    article_id = db.Column(db.Integer, db.ForeignKey("articles.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref="comments")
    article = db.relationship("Article", backref="comments")

    def to_dict(self):
        return {
            "id": self.id,
            "article_id": self.article_id,
            "user_id": self.user_id,
            "author": self.user.username if self.user else "Anonymous",
            "text": self.text,
            "created_at": self.created_at.isoformat(),
        }
