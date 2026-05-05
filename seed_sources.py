"""
Seed script: populates the database with known Balkan news sources
and their approximate media bias scores.

Bias scale:
  -1.0 = Far Left
  -0.5 = Left
   0.0 = Center
  +0.5 = Right
  +1.0 = Far Right

Run with:
    flask shell
    >>> exec(open('seed_sources.py').read())
or:
    python seed_sources.py
"""

from app import create_app, db
from app.models.source import Source
from app.models.category import Category

app = create_app()

SOURCES = [
    # ── Bosnia & Herzegovina ────────────────────────────────────────────────
    {"name": "Klix", "domain": "klix.ba", "country": "ba", "bias_score": -0.1,
     "description": "Most-visited news portal in Bosnia and Herzegovina."},
    {"name": "Avaz", "domain": "avaz.ba", "country": "ba", "bias_score": 0.2,
     "description": "Dnevni Avaz, major Bosniak-oriented daily."},
    {"name": "Nezavisne Novine", "domain": "nezavisne.com", "country": "ba", "bias_score": 0.3,
     "description": "Republika Srpska-oriented daily newspaper."},
    {"name": "Oslobođenje", "domain": "oslobodjenje.ba", "country": "ba", "bias_score": -0.2,
     "description": "One of the oldest newspapers in BiH, centrist-left leaning."},
    {"name": "N1 BiH", "domain": "n1info.ba", "country": "ba", "bias_score": -0.1,
     "description": "Regional CNN affiliate, considered centrist."},
    {"name": "Srna", "domain": "srna.rs", "country": "ba", "bias_score": 0.5,
     "description": "Official news agency of Republika Srpska."},

    # ── Serbia ───────────────────────────────────────────────────────────────
    {"name": "N1 Srbija", "domain": "n1info.rs", "country": "rs", "bias_score": -0.2,
     "description": "CNN-affiliated channel, considered center-left."},
    {"name": "Blic", "domain": "blic.rs", "country": "rs", "bias_score": 0.3,
     "description": "Popular Serbian tabloid, pro-government leaning."},
    {"name": "Politika", "domain": "politika.rs", "country": "rs", "bias_score": 0.2,
     "description": "Serbia's oldest daily newspaper, centrist-right."},
    {"name": "Nova.rs", "domain": "nova.rs", "country": "rs", "bias_score": -0.3,
     "description": "Independent digital outlet, opposition-leaning."},
    {"name": "Telegraf", "domain": "telegraf.rs", "country": "rs", "bias_score": 0.4,
     "description": "Pro-government tabloid with sensationalist style."},
    {"name": "Danas", "domain": "danas.rs", "country": "rs", "bias_score": -0.5,
     "description": "Left-leaning independent newspaper, critical of government."},

    # ── Croatia ──────────────────────────────────────────────────────────────
    {"name": "Index.hr", "domain": "index.hr", "country": "hr", "bias_score": -0.2,
     "description": "Popular Croatian news portal, centrist-left."},
    {"name": "Jutarnji List", "domain": "jutarnji.hr", "country": "hr", "bias_score": -0.1,
     "description": "Major Croatian daily newspaper."},
    {"name": "Večernji List", "domain": "vecernji.hr", "country": "hr", "bias_score": 0.3,
     "description": "Conservative Croatian daily with largest print circulation."},
    {"name": "Nacional", "domain": "nacional.hr", "country": "hr", "bias_score": -0.3,
     "description": "Investigative weekly, center-left."},

    # ── North Macedonia ──────────────────────────────────────────────────────
    {"name": "Sitel", "domain": "sitel.com.mk", "country": "mk", "bias_score": 0.2,
     "description": "Major Macedonian TV broadcaster with online presence."},
    {"name": "Meta.mk", "domain": "meta.mk", "country": "mk", "bias_score": -0.1,
     "description": "Independent Macedonian news agency."},

    # ── Montenegro ───────────────────────────────────────────────────────────
    {"name": "Vijesti", "domain": "vijesti.me", "country": "me", "bias_score": -0.3,
     "description": "Leading independent Montenegrin daily."},
    {"name": "Dan", "domain": "dan.co.me", "country": "me", "bias_score": 0.4,
     "description": "Conservative Montenegrin daily, pro-Serbian."},

    # ── Slovenia ─────────────────────────────────────────────────────────────
    {"name": "RTV Slovenija", "domain": "rtvslo.si", "country": "si", "bias_score": 0.0,
     "description": "Public broadcaster, considered centrist."},
    {"name": "Delo", "domain": "delo.si", "country": "si", "bias_score": -0.2,
     "description": "Center-left Slovenian daily."},
    {"name": "STA", "domain": "sta.si", "country": "si", "bias_score": 0.0,
     "description": "Slovenian Press Agency, neutral."},

    # ── Albania ──────────────────────────────────────────────────────────────
    {"name": "Top Channel", "domain": "top-channel.tv", "country": "al", "bias_score": 0.1,
     "description": "Albania's most-watched private TV channel."},
    {"name": "SCAN TV", "domain": "scan-tv.com", "country": "al", "bias_score": -0.2,
     "description": "Independent Albanian broadcaster."},
]

CATEGORIES = [
    {"name": "Politics", "slug": "politics"},
    {"name": "Economy", "slug": "economy"},
    {"name": "Society", "slug": "society"},
    {"name": "World", "slug": "world"},
    {"name": "Sports", "slug": "sports"},
    {"name": "Culture", "slug": "culture"},
    {"name": "Technology", "slug": "technology"},
    {"name": "Health", "slug": "health"},
    {"name": "Environment", "slug": "environment"},
    {"name": "Crime", "slug": "crime"},
]


def seed():
    with app.app_context():
        added_sources = 0
        for data in SOURCES:
            if not Source.query.filter_by(domain=data["domain"]).first():
                source = Source(**data)
                db.session.add(source)
                added_sources += 1

        added_categories = 0
        for data in CATEGORIES:
            if not Category.query.filter_by(slug=data["slug"]).first():
                category = Category(**data)
                db.session.add(category)
                added_categories += 1

        db.session.commit()
        print(f"✅ Seeded {added_sources} sources and {added_categories} categories.")


if __name__ == "__main__":
    seed()
