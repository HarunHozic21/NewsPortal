# Balkan News Portal — Backend

A Flask + PostgreSQL REST API for a Balkan news aggregation platform with media bias transparency.

## Project Structure

```
news_portal/
├── app/
│   ├── __init__.py           # App factory
│   ├── config.py             # Configuration (dev/prod)
│   ├── models/
│   │   ├── user.py           # User (reader, writer, editor, admin)
│   │   ├── source.py         # News source + bias score
│   │   ├── article.py        # Article (pulled from NewsDataAPI)
│   │   ├── category.py       # Category + article_categories junction
│   │   └── saved_article.py  # User bookmarks
│   ├── routes/
│   │   ├── auth.py           # POST /register, POST /login, GET /me
│   │   ├── articles.py       # CRUD + search + save/unsave
│   │   ├── sources.py        # CRUD + /spectrum endpoint
│   │   └── categories.py     # CRUD
│   ├── services/
│   │   └── newsdataapi_service.py  # Fetch & store from NewsDataAPI
│   └── utils/
│       └── auth_helpers.py   # role_required() decorator
├── seed_sources.py           # Seed Balkan sources with bias scores
├── run.py                    # Entry point + hourly scheduler
├── requirements.txt
└── .env.example
```

## Setup

### 1. Clone & install dependencies
```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env and fill in your values:
#   DATABASE_URL, SECRET_KEY, JWT_SECRET_KEY, NEWSDATA_API_KEY
```

### 3. Create the database
```bash
createdb news_portal_db         # or create via pgAdmin
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

### 4. Seed news sources & categories
```bash
python seed_sources.py
```

### 5. Run the app
```bash
flask run
# or
python run.py
```

## API Endpoints

### Auth  `/api/auth`
| Method | Endpoint       | Description              | Auth |
|--------|----------------|--------------------------|------|
| POST   | `/register`    | Register new user        | —    |
| POST   | `/login`       | Login, returns JWT token | —    |
| GET    | `/me`          | Get current user profile | JWT  |

### Articles  `/api/articles`
| Method | Endpoint              | Description                        | Auth         |
|--------|-----------------------|------------------------------------|--------------|
| GET    | `/`                   | List articles (search, filter)     | —            |
| GET    | `/<id>`               | Get article by ID                  | —            |
| POST   | `/`                   | Create article manually            | admin/editor |
| PUT    | `/<id>`               | Update article                     | admin/editor |
| DELETE | `/<id>`               | Soft-delete article                | admin        |
| POST   | `/<id>/save`          | Bookmark article                   | JWT          |
| DELETE | `/<id>/save`          | Remove bookmark                    | JWT          |
| GET    | `/saved`              | Get current user's bookmarks       | JWT          |

### Sources  `/api/sources`
| Method | Endpoint       | Description                       | Auth  |
|--------|----------------|-----------------------------------|-------|
| GET    | `/`            | List all sources (filter: country)| —     |
| GET    | `/<id>`        | Get source by ID                  | —     |
| POST   | `/`            | Create source                     | admin |
| PUT    | `/<id>`        | Update source / bias score        | admin |
| DELETE | `/<id>`        | Deactivate source                 | admin |
| GET    | `/spectrum`    | All sources grouped by bias label | —     |

### Categories  `/api/categories`
| Method | Endpoint  | Description        | Auth  |
|--------|-----------|--------------------|-------|
| GET    | `/`       | List categories    | —     |
| POST   | `/`       | Create category    | admin |
| DELETE | `/<id>`   | Delete category    | admin |

## Article Search & Filtering

`GET /api/articles/?search=nato&country=ba&language=bs&bias_min=-0.5&bias_max=0.5&category=politics&page=1&per_page=20`

## Bias Spectrum

`GET /api/sources/spectrum` returns sources grouped into:
```json
{
  "far_left": [...],
  "left": [...],
  "center": [...],
  "right": [...],
  "far_right": [...]
}
```
Each source includes `bias_score` (float, -1.0 to 1.0) and `bias_label`.
