"""
Unit tests for NewsPortal backend.
Tests cover: user registration, login, article retrieval,
save/unsave articles, and comment posting.

Run with: pytest tests/test_newsportal.py -v
"""

import pytest
import json
from app import create_app, db
from app.models.user import User
from app.models.article import Article
from app.models.source import Source
from app.models.category import Category


@pytest.fixture
def app():
    """Create a test Flask app with an in-memory SQLite database."""
    app = create_app("testing")
    app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "JWT_SECRET_KEY": "test-secret-key-for-testing-only",
    })

    with app.app_context():
        db.create_all()
        _seed_data()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Return a test client for the app."""
    return app.test_client()


@pytest.fixture
def auth_headers(client):
    """Register and log in a test user, return auth headers."""
    client.post("/api/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "Test1234!",
    })
    res = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "Test1234!",
    })
    token = res.get_json()["token"]
    return {"Authorization": f"Bearer {token}"}


def _seed_data():
    """Insert a source and two articles into the test database."""
    source = Source(name="Test Source", domain="test.com", country="ba", bias_score=0.0)
    db.session.add(source)
    db.session.flush()

    article1 = Article(
        title="Bosnia Joins EU Talks",
        description="Bosnia takes steps toward EU membership.",
        content="Full content here.",
        url="https://test.com/article/1",
        source_id=source.id,
        is_active=True,
    )
    article2 = Article(
        title="Serbia Infrastructure Project",
        description="Serbia launches new rail project.",
        content="Full content here.",
        url="https://test.com/article/2",
        source_id=source.id,
        is_active=True,
    )
    db.session.add_all([article1, article2])
    db.session.commit()


# ─── TEST 1: User Registration ────────────────────────────────────────────────

def test_user_registration(client):
    """
    Test that a new user can register successfully.
    Verifies that the API returns 201 and a JWT token.
    """
    res = client.post("/api/auth/register", json={
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "Password123!",
    })
    data = res.get_json()

    assert res.status_code == 201
    assert "token" in data
    assert data["user"]["username"] == "newuser"
    assert data["user"]["email"] == "newuser@example.com"
    assert data["user"]["role"] == "reader"


# ─── TEST 2: User Login ───────────────────────────────────────────────────────

def test_user_login(client):
    """
    Test that a registered user can log in with correct credentials.
    Verifies that the API returns 200 and a valid JWT token.
    Also tests that wrong credentials return 401.
    """
    # Register first
    client.post("/api/auth/register", json={
        "username": "loginuser",
        "email": "login@example.com",
        "password": "Password123!",
    })

    # Correct login
    res = client.post("/api/auth/login", json={
        "email": "login@example.com",
        "password": "Password123!",
    })
    data = res.get_json()
    assert res.status_code == 200
    assert "token" in data

    # Wrong password
    res_bad = client.post("/api/auth/login", json={
        "email": "login@example.com",
        "password": "WrongPassword!",
    })
    assert res_bad.status_code == 401


# ─── TEST 3: Article Retrieval ────────────────────────────────────────────────

def test_get_articles(client):
    """
    Test that the articles endpoint returns a list of active articles.
    Verifies pagination fields and article structure.
    """
    res = client.get("/api/articles/")
    data = res.get_json()

    assert res.status_code == 200
    assert "articles" in data
    assert len(data["articles"]) == 2
    assert "total" in data
    assert "page" in data

    article = data["articles"][0]
    assert "id" in article
    assert "title" in article
    assert "source" in article


def test_get_single_article(client):
    """
    Test that a single article can be retrieved by ID.
    Also verifies that a non-existent article returns 404.
    """
    # Get first article id
    res = client.get("/api/articles/")
    article_id = res.get_json()["articles"][0]["id"]

    # Get by ID
    res = client.get(f"/api/articles/{article_id}")
    assert res.status_code == 200
    assert res.get_json()["id"] == article_id

    # Non-existent article
    res_404 = client.get("/api/articles/99999")
    assert res_404.status_code == 404


# ─── TEST 4: Save & Unsave Article ───────────────────────────────────────────

def test_save_and_unsave_article(client, auth_headers):
    """
    Test that an authenticated user can save and unsave an article.
    Verifies the saved list updates accordingly.
    """
    # Get an article ID
    res = client.get("/api/articles/")
    article_id = res.get_json()["articles"][0]["id"]

    # Save article
    res_save = client.post(
        f"/api/articles/{article_id}/save",
        headers=auth_headers,
    )
    assert res_save.status_code in (200, 201)

    # Verify it appears in saved list
    res_saved = client.get("/api/articles/saved", headers=auth_headers)
    saved_ids = [s["article"]["id"] for s in res_saved.get_json()]
    assert article_id in saved_ids

    # Unsave article
    res_unsave = client.delete(
        f"/api/articles/{article_id}/save",
        headers=auth_headers,
    )
    assert res_unsave.status_code == 200

    # Verify it's removed from saved list
    res_saved_after = client.get("/api/articles/saved", headers=auth_headers)
    saved_ids_after = [s["article"]["id"] for s in res_saved_after.get_json()]
    assert article_id not in saved_ids_after


# ─── TEST 5: Post & Delete Comment ───────────────────────────────────────────

def test_post_and_delete_comment(client, auth_headers):
    """
    Test that an authenticated user can post a comment on an article
    and then delete their own comment.
    """
    # Get an article ID
    res = client.get("/api/articles/")
    article_id = res.get_json()["articles"][0]["id"]

    # Post a comment
    res_post = client.post(
        f"/api/articles/{article_id}/comments",
        json={"text": "This is a test comment."},
        headers=auth_headers,
    )
    assert res_post.status_code == 201
    comment_id = res_post.get_json()["id"]

    # Verify comment appears in article's comments
    res_comments = client.get(f"/api/articles/{article_id}/comments")
    comment_ids = [c["id"] for c in res_comments.get_json()]
    assert comment_id in comment_ids

    # Delete the comment
    res_delete = client.delete(
        f"/api/articles/{article_id}/comments/{comment_id}",
        headers=auth_headers,
    )
    assert res_delete.status_code == 200

    # Verify comment is gone
    res_comments_after = client.get(f"/api/articles/{article_id}/comments")
    comment_ids_after = [c["id"] for c in res_comments_after.get_json()]
    assert comment_id not in comment_ids_after