# ADD THIS ROUTE to the bottom of app/routes/articles.py

@articles_bp.route("/<int:article_id>/content", methods=["GET"])
def get_article_content(article_id):
    article = Article.query.filter_by(id=article_id, is_active=True).first_or_404()
    if article.content and len(article.content.strip()) > 100:
        return jsonify({"content": article.content, "source": "db"}), 200
    if not article.url:
        return jsonify({"content": article.description or "", "source": "description"}), 200
    from app.services.newsdataapi_service import scrape_full_text
    content = scrape_full_text(article.url)
    if content:
        article.content = content
        db.session.commit()
        return jsonify({"content": content, "source": "scraped"}), 200
    return jsonify({"content": article.description or "", "source": "description"}), 200
