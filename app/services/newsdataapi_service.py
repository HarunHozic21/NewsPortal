import logging
from datetime import datetime, timezone
from newsdataapi import NewsDataApiClient
from app import db
from app.models.article import Article
from app.models.source import Source
from app.models.category import Category

logger = logging.getLogger(__name__)


def get_or_create_source(source_name: str, domain: str, country: str) -> Source:
    """
    Find an existing source by domain, or create a new one with a neutral
    bias score of 0.0. Admin can update the bias score later via the API.
    """
    source = Source.query.filter_by(domain=domain).first()
    if not source:
        source = Source(
            name=source_name or domain,
            domain=domain,
            country=country,
            bias_score=0.0,
        )
        db.session.add(source)
        db.session.flush()  # get ID without committing
        logger.info(f"Created new source: {source.name} ({domain})")
    return source


def get_or_create_category(name: str) -> Category:
    """Find or create a category by name."""
    slug = name.lower().replace(" ", "-")
    category = Category.query.filter_by(slug=slug).first()
    if not category:
        category = Category(name=name.capitalize(), slug=slug)
        db.session.add(category)
        db.session.flush()
    return category


def parse_published_at(date_str: str | None) -> datetime | None:
    """Parse the NewsDataAPI datetime string into a Python datetime object."""
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def fetch_and_store_articles(app, api_key: str, countries: str, languages: str) -> int:
    """
    Fetch articles from NewsDataAPI and store them in the database.
    Skips articles that already exist (by external_id).

    Returns the number of newly stored articles.
    """
    client = NewsDataApiClient(apikey=api_key)
    stored_count = 0

    with app.app_context():
        try:
            response1 = client.news_api(
                country="ba,rs,hr,mk,me",
                language=languages,
            )
            response2 = client.news_api(
                country="si,al",
                language=languages,
            )

            results = response1.get("results", []) + response2.get("results", [])
            logger.info(f"Fetched {len(results)} articles from NewsDataAPI")

            for item in results:
                external_id = item.get("article_id")

                # Skip if already stored
                if external_id and Article.query.filter_by(external_id=external_id).first():
                    continue

                # Resolve source
                source_url = item.get("source_url", "")
                domain = source_url.replace("https://", "").replace("http://", "").strip("/")
                source_name = item.get("source_name", domain)
                country_code = (item.get("country") or ["ba"])[0]  # NewsDataAPI returns a list

                source = get_or_create_source(source_name, domain, country_code)

                # Build article
                article = Article(
                    external_id=external_id,
                    title=item.get("title", "Untitled"),
                    description=item.get("description"),
                    content=item.get("full_content") or item.get("content"),
                    url=item.get("link", ""),
                    image_url=item.get("image_url"),
                    language=item.get("language"),
                    published_at=parse_published_at(item.get("pubDate")),
                    source_id=source.id,
                )

                db.session.add(article)
                db.session.flush()

                # Attach categories
                for cat_name in (item.get("category") or []):
                    if cat_name:
                        category = get_or_create_category(cat_name)
                        article.categories.append(category)

                stored_count += 1

            db.session.commit()
            logger.info(f"Stored {stored_count} new articles")

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error fetching from NewsDataAPI: {e}")
            raise

    return stored_count