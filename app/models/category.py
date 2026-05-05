from app import db

# Junction table for many-to-many between Article and Category
article_categories = db.Table(
    "article_categories",
    db.Column("article_id", db.Integer, db.ForeignKey("articles.id"), primary_key=True),
    db.Column("category_id", db.Integer, db.ForeignKey("categories.id"), primary_key=True),
)


class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)   # e.g. "Politics"
    slug = db.Column(db.String(50), unique=True, nullable=False)   # e.g. "politics"

    # Relationships
    articles = db.relationship(
        "Article",
        secondary=article_categories,
        back_populates="categories",
        lazy="dynamic",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
        }

    def __repr__(self):
        return f"<Category {self.name}>"
