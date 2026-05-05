from app import create_app, db
from app.models import User, Source, Article, Category, SavedArticle
from apscheduler.schedulers.background import BackgroundScheduler
import os

app = create_app(os.getenv("FLASK_ENV", "development"))


def scheduled_fetch():
    """Auto-fetch articles every hour from NewsDataAPI."""
    from app.services.newsdataapi_service import fetch_and_store_articles
    from app.config import Config
    api_key = Config.NEWSDATA_API_KEY
    if api_key:
        count = fetch_and_store_articles(
            app,
            api_key=api_key,
            countries=Config.NEWSDATA_COUNTRIES,
            languages=Config.NEWSDATA_LANGUAGES,
        )
        print(f"[Scheduler] Fetched and stored {count} new articles")
    else:
        print("[Scheduler] NEWSDATA_API_KEY not set, skipping fetch")


# Set up background scheduler to pull news every hour
scheduler = BackgroundScheduler()
scheduler.add_job(scheduled_fetch, "interval", hours=1, id="fetch_news")
scheduler.start()


@app.shell_context_processor
def make_shell_context():
    return {
        "db": db,
        "User": User,
        "Source": Source,
        "Article": Article,
        "Category": Category,
        "SavedArticle": SavedArticle,
    }


if __name__ == "__main__":
    app.run(debug=True)
