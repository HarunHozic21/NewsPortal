/**
 * article.js — Article detail page controller
 */

const _API_BASE = "https://newsportal-3pyx.onrender.com/api";

let currentArticle = null;
let comments = [];
let isSaved = false;

document.addEventListener("DOMContentLoaded", async () => {
  Auth.tryAutoLogin();
  EventBus.on("auth:changed", () => {
    Auth.updateNavbar();
    updateCommentForm();
  });

  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    showArticleError("No article ID provided.");
    return;
  }

  await Promise.all([loadArticle(id), loadComments(id)]);
  checkIfSaved(id);
});

async function checkIfSaved(articleId) {
  if (!Auth.isLoggedIn()) return;
  try {
    const saved = await ApiService.getSavedArticles();
    const ids = saved.map((s) => String(s.article_id || s.id));
    isSaved = ids.includes(String(articleId));
    const btn = document.getElementById("saveBtn");
    if (btn) {
      btn.innerHTML = isSaved
        ? '<i class="bi bi-bookmark-fill me-1"></i> Saved'
        : '<i class="bi bi-bookmark me-1"></i> Save';
    }
  } catch {
    /* not logged in or no saved articles */
  }
}

async function loadArticle(id) {
  let article = null;

  // 1. Try backend
  try {
    const data = await ApiService.getArticle(id);
    article = data;
  } catch {
    /* fall through */
  }

  // 2. Try mock
  if (!article) {
    article = MOCK.articles.find((a) => String(a.id) === String(id));
  }

  if (!article) {
    showArticleError("Article not found.");
    return;
  }

  // Normalise field names
  currentArticle = {
    id: article.id,
    title: article.title,
    excerpt: article.description || article.excerpt || "",
    body: article.content || article.body || article.description || "",
    country: article.source?.country || article.country || "",
    category: article.categories?.[0]?.name || article.category || "",
    source: article.source?.name || article.source || "",
    bias:
      article.source?.bias_label?.toLowerCase().replace(" ", "_") ||
      article.bias ||
      "center",
    image:
      article.image_url ||
      article.image ||
      `https://picsum.photos/seed/${article.id}/800/450`,
    published_at: article.published_at || article.created_at || "",
  };

  renderArticle(currentArticle);
  renderBiasMeter(currentArticle);
  renderRelated(currentArticle);
}

function renderArticle(a) {
  document.title = `${a.title} — Balkanske Vijesti`;

  const bias = BiasStrategy.resolve(a.bias);
  document.getElementById("articleHeaderContent").innerHTML = `
    <div class="article-page-category">${countryFlag(a.country)} ${a.country} &nbsp;·&nbsp; ${a.category}</div>
    <h1 class="article-page-title">${a.title}</h1>
    <div class="article-page-meta">
      <span><i class="bi bi-building me-1"></i>${a.source}</span>
      <span><i class="bi bi-calendar3 me-1"></i>${formatDate(a.published_at)}</span>
      <span class="bias-badge ${bias.cssClass}">${bias.label}</span>
    </div>`;

  // Hero image
  if (a.image) {
    const img = document.getElementById("articleHeroImg");
    img.src = a.image;
    img.onerror = () => {
      img.style.display = "none";
    };
    img.classList.remove("d-none");
  }

  // Body — split on newlines into paragraphs
  const bodyText = a.body || a.excerpt || "Full article not available.";
  const paras = bodyText.split(/\n+/).filter((p) => p.trim());
  document.getElementById("articleBody").innerHTML = paras.length
    ? paras.map((p) => `<p>${escapeHtml(p.trim())}</p>`).join("")
    : `<p>${escapeHtml(bodyText)}</p>`;

  // Actions
  document.getElementById("articleActions").style.display = "flex";
  document.getElementById("shareTwitter").href =
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(a.title)}&url=${encodeURIComponent(location.href)}`;
  document.getElementById("shareFacebook").href =
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.href)}`;
}

function renderBiasMeter(a) {
  const source = MOCK.sources.find((s) => s.name === a.source) || {};
  const biasVal = source.bias || a.bias || "center";
  const bias = BiasStrategy.resolve(biasVal);

  document.getElementById("biasMeterCard").style.display = "block";
  document.getElementById("biasSourceName").textContent = a.source;
  document.getElementById("biasDescription").textContent =
    source.description || `This source leans ${bias.label}.`;

  setTimeout(() => {
    document.getElementById("biasIndicator").style.left = `${bias.pct}%`;
  }, 400);
}

function renderRelated(a) {
  const related = MOCK.articles
    .filter(
      (x) =>
        String(x.id) !== String(a.id) &&
        (x.country === a.country || x.category === a.category),
    )
    .slice(0, 3);

  if (!related.length) return;
  document.getElementById("relatedSection").style.display = "block";
  const grid = document.getElementById("relatedGrid");
  grid.innerHTML = related
    .map((r) => {
      const bias = BiasStrategy.resolve(r.bias);
      return `
      <a class="article-card" href="article.html?id=${r.id}">
        <img class="article-thumb" src="${r.image}" alt="" loading="lazy"/>
        <div style="flex:1">
          <div class="article-meta-row">
            <span class="article-category">${r.category}</span>
            <span class="article-country-badge">${countryFlag(r.country)} ${r.country}</span>
          </div>
          <div class="article-title">${r.title}</div>
          <div class="article-footer">
            <span>${r.source}</span>
            <span class="bias-badge ${bias.cssClass}">${bias.label}</span>
          </div>
        </div>
      </a>`;
    })
    .join("");
}

// ─── SAVE ────────────────────────────────────
async function toggleSave() {
  if (!Auth.isLoggedIn()) {
    window.location.href = `login.html?redirect=${encodeURIComponent(location.href)}`;
    return;
  }
  const btn = document.getElementById("saveBtn");
  try {
    if (isSaved) {
      await ApiService.unsaveArticle(currentArticle.id);
      isSaved = false;
      btn.innerHTML = '<i class="bi bi-bookmark me-1"></i> Save';
    } else {
      await ApiService.saveArticle(currentArticle.id);
      isSaved = true;
      btn.innerHTML = '<i class="bi bi-bookmark-fill me-1"></i> Saved';
    }
  } catch {
    showToast("Could not save article.", "error");
  }
}

// ─── COMMENTS ────────────────────────────────
async function loadComments(articleId) {
  try {
    const data = await ApiService.getComments(articleId);
    comments = Array.isArray(data) ? data : data.comments || [];
  } catch {
    comments = [
      {
        id: 1,
        author: "Marko K.",
        text: "Great piece of journalism. The context given is exactly what was missing from other coverage.",
        created_at: "2025-06-05T09:15:00Z",
      },
      {
        id: 2,
        author: "Amira H.",
        text: "Appreciate the balanced reporting. I wish there was more detail on civil society reactions.",
        created_at: "2025-06-05T10:02:00Z",
      },
    ];
  }
  renderComments();
  updateCommentForm();
}

function renderComments() {
  const el = document.getElementById("commentsList");
  const count = document.getElementById("commentCount");
  if (count) count.textContent = `(${comments.length})`;
  if (!comments.length) {
    el.innerHTML = `<p style="color:var(--text-muted);padding:20px 0;font-size:14px">No comments yet. Be the first.</p>`;
    return;
  }
  el.innerHTML = comments
    .map(
      (c) => `
    <div class="comment-card fade-in">
      <div class="comment-header">
        <div class="comment-author">
          <div class="comment-avatar">${(c.author || c.username || "U")[0].toUpperCase()}</div>
          ${escapeHtml(c.author || c.username || "Anonymous")}
        </div>
        <span class="comment-date">${formatDate(c.created_at)}</span>
      </div>
      <div class="comment-body">${escapeHtml(c.text || c.content || "")}</div>
    </div>`,
    )
    .join("");
}

function updateCommentForm() {
  const loggedIn = Auth.isLoggedIn();
  const prompt = document.getElementById("loginPrompt");
  const form = document.getElementById("commentForm");
  if (prompt) prompt.classList.toggle("d-none", loggedIn);
  if (form) form.classList.toggle("d-none", !loggedIn);
}

async function postComment() {
  if (!Auth.isLoggedIn()) {
    window.location.href = `login.html?redirect=${encodeURIComponent(location.href)}`;
    return;
  }
  const text = document.getElementById("commentText")?.value?.trim();
  const errEl = document.getElementById("commentFormError");
  if (!text) {
    if (errEl) errEl.textContent = "Please write something.";
    return;
  }
  if (errEl) errEl.textContent = "";

  const btn = document.querySelector(".btn-comment");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Posting…";
  }

  try {
    const id = new URLSearchParams(location.search).get("id");
    await ApiService.postComment(id, text);
  } catch {
    /* if endpoint doesn't exist yet, just add locally */
  }

  const user = Auth.getUser();
  comments.unshift({
    id: Date.now(),
    author: user?.username || user?.email || "You",
    text,
    created_at: new Date().toISOString(),
  });
  document.getElementById("commentText").value = "";
  renderComments();
  showToast("Comment posted!", "success");
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = 'Post Comment <i class="bi bi-send ms-1"></i>';
  }
}

function showArticleError(msg) {
  document.getElementById("articleHeaderContent").innerHTML =
    `<h1 class="article-page-title" style="color:var(--white)">Article Not Found</h1>`;
  document.getElementById("articleBody").innerHTML =
    `<p style="color:var(--text-muted)">${msg} <a href="../index.html" style="color:var(--accent)">Return home.</a></p>`;
}

// Add postComment to ApiService if missing
if (!ApiService.postComment) {
  ApiService.postComment = (articleId, text) => {
    const token = localStorage.getItem("bv_token");
    return fetch(`${_API_BASE}/articles/${articleId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text }),
    }).then((r) => r.json());
  };
}
if (!ApiService.getComments) {
  ApiService.getComments = (articleId) =>
    fetch(`${_API_BASE}/articles/${articleId}/comments`).then((r) => r.json());
}