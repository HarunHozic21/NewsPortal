import logging
from datetime import datetime, timezone
import urllib.request
from bs4 import BeautifulSoup
from newsdataapi import NewsDataApiClient
from app import db
from app.models.article import Article
from app.models.source import Source
from app.models.category import Category

logger = logging.getLogger(__name__)


def scrape_full_text(url: str) -> str | None:
    """
    Fallback Web Scraper: Extracts readable paragraph text from an original
    news URL when the free API tier restricts the content field.
    """
    if not url:
        return None
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            html = response.read()

        soup = BeautifulSoup(html, "html.parser")

        for element in soup(["script", "style", "nav", "header", "footer", "form"]):
            element.extract()

        paragraphs = soup.find_all("p")
        text_content = "\n\n".join(
            [p.get_text().strip() for p in paragraphs if len(p.get_text().strip()) > 20]
        )

        return text_content if text_content else None
    except Exception as e:
        logger.warning(f"Failed to scrape text from {url}: {e}")
        return None


def get_or_create_source(source_name: str, domain: str, country: str) -> Source:
    source = Source.query.filter_by(domain=domain).first()
    if not source:
        source = Source(
            name=source_name or domain,
            domain=domain,
            country=country,
            bias_score=0.0,
        )
        db.session.add(source)
        db.session.flush()
        logger.info(f"Created new source: {source.name} ({domain})")
    return source


def get_or_create_category(name: str) -> Category:
    slug = name.lower().replace(" ", "-")
    category = Category.query.filter_by(slug=slug).first()
    if not category:
        category = Category(name=name.capitalize(), slug=slug)
        db.session.add(category)
        db.session.flush()
    return category


def parse_published_at(date_str: str | None) -> datetime | None:
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S").replace(
            tzinfo=timezone.utc
        )
    except ValueError:
        return None


def fetch_and_store_articles(app, api_key: str, countries: str, languages: str) -> int:
    client = NewsDataApiClient(apikey=api_key)
    stored_count = 0

    with app.app_context():
        try:
            response1 = client.news_api(country="ba,rs,hr,mk,me", language=languages)
            response2 = client.news_api(country="si,al", language=languages)

            results = response1.get("results", []) + response2.get("results", [])
            logger.info(f"Fetched {len(results)} articles from NewsDataAPI")

            for item in results:
                external_id = item.get("article_id")

                # Skip if already stored
                if (
                    external_id
                    and Article.query.filter_by(external_id=external_id).first()
                ):
                    continue

                # Resolve source
                source_url = item.get("source_url", "")
                domain = (
                    source_url.replace("https://", "").replace("http://", "").strip("/")
                )
                source_name = item.get("source_name", domain)
                country_code = (item.get("country") or ["ba"])[0]

                source = get_or_create_source(source_name, domain, country_code)

                article_url = item.get("link", "")

                # Treat paid-plan placeholder as empty
                api_content = item.get("full_content") or item.get("content")
                if api_content and "ONLY AVAILABLE IN PAID PLANS" in api_content:
                    api_content = None

                # If API content is empty/restricted, scrape the live URL
                if not api_content and article_url:
                    logger.info(
                        f"Free API limit met. Scraping full content for: {article_url}"
                    )
                    article_content = (
                        scrape_full_text(article_url)
                        or item.get("description")
                        or ""
                    )
                else:
                    article_content = api_content or item.get("description") or ""

                # Build article
                article = Article(
                    external_id=external_id,
                    title=item.get("title", "Untitled"),
                    description=item.get("description"),
                    content=article_content,
                    url=article_url,
                    image_url=item.get("image_url"),
                    language=item.get("language"),
                    published_at=parse_published_at(item.get("pubDate")),
                    source_id=source.id,
                )

                db.session.add(article)
                db.session.flush()

                for cat_name in item.get("category") or []:
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