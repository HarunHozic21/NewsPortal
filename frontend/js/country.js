/**
 * country.js — Country page controller
 */
document.addEventListener("DOMContentLoaded", async () => {
  Auth.tryAutoLogin();
  const country =
    new URLSearchParams(location.search).get("country") || "Bosnia";
  const info = MOCK.countries[country] || {
    name: country,
    flag: "🌍",
    color: "#2c3e50",
  };

  document.title = `${info.name} — Balkanske Vijesti`;

  // Hero
  document.getElementById("countryHeroContent").innerHTML = `
    <div class="country-hero-flag">${info.flag}</div>
    <h1 class="country-hero-name">${info.name}</h1>
    <p class="country-hero-sub">Latest news from ${info.name}</p>`;
  document.getElementById("countryHero").style.borderBottom =
    `4px solid ${info.color}`;

  // Articles - try multiple country codes
  let articles = [];
  const codesToTry = [info.code, info.altCode].filter(Boolean);

  for (const code of codesToTry) {
    try {
      const data = await ApiService.getArticles({
        country: code,
        per_page: 100,
      });
      const items = Array.isArray(data) ? data : data.articles || [];
      articles = [...articles, ...items];
    } catch {}
  }

  // Deduplicate by id
  const seen = new Set();
  articles = articles.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  // Only fall back to mock if nothing came from DB
  if (!articles.length) {
    articles = MOCK.articles.filter((a) => a.country === country);
  }

  const title = document.getElementById("countryArticlesTitle");
  title.textContent = `${info.flag} ${info.name} News (${articles.length})`;

  const grid = document.getElementById("countryArticlesGrid");
  const noEl = document.getElementById("noArticles");

  if (!articles.length) {
    noEl.classList.remove("d-none");
  } else {
    articles.forEach((a, i) => {
      const bias = BiasStrategy.resolve(a.bias || a.bias_score);
      const card = document.createElement("a");
      card.className = "article-card fade-in";
      card.href = `article.html?id=${a.id}`;
      card.style.animationDelay = `${i * 0.06}s`;
      card.innerHTML = `
        <img class="article-thumb" src="${a.image || a.image_url || "https://picsum.photos/seed/" + a.id + "c/300/200"}" alt="" loading="lazy"/>
        <div style="flex:1">
          <div class="article-meta-row">
            <span class="article-category">${a.category || "News"}</span>
          </div>
          <div class="article-title">${a.title}</div>
          <div class="article-excerpt">${a.excerpt || a.description || ""}</div>
          <div class="article-footer">
            <span>${a.source || a.source_name || ""} · ${formatDate(a.published_at)}</span>
            <span class="bias-badge ${bias.cssClass}">${bias.label}</span>
          </div>
        </div>`;
      grid.appendChild(card);
    });
  }

  // Other countries sidebar
  const others = document.getElementById("otherCountries");
  others.innerHTML = Object.entries(MOCK.countries)
    .filter(([k]) => k !== country)
    .map(
      ([k, v]) =>
        `<a href="country.html?country=${k}" class="country-card-mini">${v.flag} ${v.name}</a>`,
    )
    .join("");

  // Local bias sidebar
  const localSources = MOCK.sources.filter(
    (s) => s.country === country || s.country === "Regional",
  );
  const biasEl = document.getElementById("localBias");
  if (localSources.length) {
    biasEl.innerHTML = localSources
      .map((s) => {
        const bias = BiasStrategy.resolve(s.bias);
        return `
        <div class="bias-bar-row">
          <div class="bias-source-name" style="font-size:12px">${s.name}</div>
          <div class="bias-bar-wrap">
            <div class="bias-bar-fill" style="width:${bias.pct}%;background:${bias.color}"></div>
          </div>
          <div class="bias-source-label ${bias.cssClass}" style="font-size:10px">${bias.label}</div>
        </div>`;
      })
      .join("");
  } else {
    biasEl.innerHTML = `<p style="font-size:13px;color:var(--text-muted)">No local sources tracked yet.</p>`;
  }
});

function formatDate(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}
