/**
 * app.js — Homepage controller
 */

let allArticles = [];
let displayedCount = 0;
const PAGE_SIZE = 6;
let activeFilter = "all";

document.addEventListener("DOMContentLoaded", async () => {
  setTopbarDate();
  Auth.tryAutoLogin();

  // Country/category filter buttons
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      document
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      await fetchAndRender(activeFilter);
    });
  });

  // Search on enter
  const si = document.getElementById("searchInput");
  if (si)
    si.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch();
    });

  await Promise.all([loadArticles(), loadBiasWidget()]);
});

function setTopbarDate() {
  const el = document.getElementById("topbarDate");
  if (el)
    el.textContent = new Date().toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
}

async function loadArticles() {
  allArticles = await fetchArticles({ per_page: 20 });
  renderHero();
  renderTicker();
  renderTrending();
  renderArticles(true);
}

// Normalise backend field names to our expected format
function normaliseArticle(a) {
  return {
    id: a.id,
    title: a.title,
    excerpt: a.description || a.excerpt || "",
    body: a.content || a.body || a.description || "",
    country: a.source?.country || a.country || "",
    category: a.categories?.[0]?.name || a.category || "",
    source: a.source?.name || a.source || "",
    bias:
      a.source?.bias_label?.toLowerCase().replace(" ", "_") ||
      a.bias ||
      "center",
    image:
      a.image_url || a.image || `https://picsum.photos/seed/${a.id}/600/400`,
    published_at: a.published_at || a.created_at || "",
  };
}

function renderHero() {
  if (!allArticles.length) return;
  const main = allArticles[0];
  const sides = allArticles.slice(1, 4);

  const heroMain = document.getElementById("heroMain");
  if (!heroMain) return;
  heroMain.innerHTML = `
    <div class="hero-main-inner" style="background-image:url('${main.image}')"></div>
    <div class="hero-overlay"></div>
    <div class="hero-content">
      <div class="hero-category">${main.category || "News"}</div>
      <h1 class="hero-title">${main.title}</h1>
      <div class="hero-meta">
        <span class="hero-flag">${countryFlag(main.country)}</span>
        <strong>${main.source}</strong> &nbsp;·&nbsp; ${formatDate(main.published_at)}
      </div>
    </div>`;
  heroMain.style.cursor = "pointer";
  heroMain.onclick = () => {
    window.location.href = articlePath(main.id);
  };

  const heroSide = document.getElementById("heroSide");
  if (!heroSide) return;
  heroSide.innerHTML = sides
    .map(
      (a) => `
    <div class="side-article" onclick="window.location.href='${articlePath(a.id)}'">
      <img class="side-thumb" src="${a.image}" alt="" loading="lazy" onerror="this.src='https://picsum.photos/seed/${a.id}s/160/160'"/>
      <div class="side-content">
        <div class="side-category">${a.category || "News"}</div>
        <div class="side-title">${a.title}</div>
        <div class="side-meta">${countryFlag(a.country)} ${a.source}</div>
      </div>
    </div>`,
    )
    .join("");
}

function renderTicker() {
  const el = document.getElementById("tickerContent");
  if (!el) return;
  el.innerHTML = allArticles
    .slice(0, 8)
    .map(
      (a) =>
        `<span class="ticker-item">${countryFlag(a.country)} ${a.title}</span><span class="ticker-dot">◆</span>`,
    )
    .join("");
}

function renderTrending() {
  const el = document.getElementById("trendingList");
  if (!el) return;
  const trending = allArticles.slice(0, 5);
  el.innerHTML = trending
    .map(
      (a, i) => `
    <a class="trending-item" href="${articlePath(a.id)}">
      <span class="trending-num">${String(i + 1).padStart(2, "0")}</span>
      <div>
        <div class="trending-title">${a.title}</div>
        <div class="trending-meta">${countryFlag(a.country)} ${a.source}</div>
      </div>
    </a>`,
    )
    .join("");
}

function renderArticles(reset = false) {
  if (reset) {
    displayedCount = 0;
    document.getElementById("articlesGrid").innerHTML = "";
  }

  const filtered =
    activeFilter === "all"
      ? allArticles
      : allArticles.filter((a) => {
          const info = MOCK.countries[activeFilter];
          if (!info) return false;
          return (
            a.country === activeFilter ||
            a.country === info.code ||
            a.country === info.altCode ||
            a.country === info.name.toLowerCase()
          );
        });

  const slice = filtered.slice(displayedCount, displayedCount + PAGE_SIZE);
  const grid = document.getElementById("articlesGrid");
  if (!grid) return;

  if (!slice.length && displayedCount === 0) {
    grid.innerHTML = `<p style="color:var(--text-muted);padding:2rem 0">No articles found.</p>`;
    return;
  }

  slice.forEach((a, i) => {
    const bias = BiasStrategy.resolve(a.bias);
    const card = document.createElement("a");
    card.className = "article-card fade-in";
    card.href = articlePath(a.id);
    card.style.animationDelay = `${i * 0.06}s`;
    card.innerHTML = `
      <img class="article-thumb" src="${a.image}" alt="" loading="lazy" onerror="this.src='https://picsum.photos/seed/${a.id}t/300/200'"/>
      <div style="flex:1">
        <div class="article-meta-row">
          <span class="article-category">${a.category || "News"}</span>
          <span class="article-country-badge">${countryFlag(a.country)} ${a.country}</span>
        </div>
        <div class="article-title">${a.title}</div>
        <div class="article-excerpt">${a.excerpt}</div>
        <div class="article-footer">
          <span>${a.source} · ${formatDate(a.published_at)}</span>
          <span class="bias-badge ${bias.cssClass}">${bias.label}</span>
        </div>
      </div>`;
    grid.appendChild(card);
  });

  displayedCount += slice.length;
  const wrap = document.getElementById("loadMoreWrap");
  if (wrap)
    wrap.style.display = displayedCount >= filtered.length ? "none" : "block";
}

function loadMoreArticles() {
  renderArticles(false);
}

async function loadBiasWidget() {
  let sources;
  try {
    const data = await ApiService.getBiasSpectrum();
    sources = Array.isArray(data) ? data : data.sources || [];
    if (!sources.length) throw new Error();
  } catch {
    sources = MOCK.sources;
  }

  const el = document.getElementById("biasMini");
  if (!el) return;
  el.innerHTML = sources
    .slice(0, 5)
    .map((s) => {
      const bias = BiasStrategy.resolve(s.bias || s.bias_score);
      return `
      <div class="bias-bar-row">
        <div class="bias-source-name">${s.name}</div>
        <div class="bias-bar-wrap"><div class="bias-bar-fill" style="width:${bias.pct}%;background:${bias.color}"></div></div>
        <div class="bias-source-label ${bias.cssClass}">${bias.label}</div>
      </div>`;
    })
    .join("");
}

function doSearch() {
  const q = document.getElementById("searchInput")?.value?.trim();
  if (q) window.location.href = `pages/search.html?q=${encodeURIComponent(q)}`;
}

async function fetchAndRender(filter) {
  const grid = document.getElementById("articlesGrid");
  grid.innerHTML = "";
  displayedCount = 0;

  if (filter === "all") {
    allArticles = await fetchArticles({});
  } else {
    const info = MOCK.countries[filter];
    if (info) {
      let articles1 = [],
        articles2 = [];
      try {
        const d = await ApiService.getArticles({
          country: info.code,
          per_page: 20,
        });
        articles1 = Array.isArray(d) ? d : d.articles || [];
      } catch {}
      if (info.altCode) {
        try {
          const d = await ApiService.getArticles({
            country: info.altCode,
            per_page: 20,
          });
          articles2 = Array.isArray(d) ? d : d.articles || [];
        } catch {}
      }
      const seen = new Set();
      allArticles = [...articles1, ...articles2]
        .filter((a) => {
          if (seen.has(a.id)) return false;
          seen.add(a.id);
          return true;
        })
        .map(normaliseArticle);
    } else {
      allArticles = (await fetchArticles({})).filter(
        (a) => a.category === filter,
      );
    }
  }

  renderArticles(true);
}

async function fetchArticles(params) {
  try {
    const data = await ApiService.getArticles({ per_page: 20, ...params });
    const items = Array.isArray(data) ? data : data.articles || [];
    return items.map(normaliseArticle);
  } catch {
    return [];
  }
}