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

  try {
    const data = await ApiService.getArticle(id);
    article = data;
  } catch {
    /* fall through */
  }

  if (!article) {
    showArticleError("Article not found.");
    return;
  }

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
    url: article.url || "",
  };

  renderArticle(currentArticle);
  renderBiasMeter(currentArticle);
  await renderRelated(currentArticle);
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

  if (a.image) {
    const img = document.getElementById("articleHeroImg");
    img.src = a.image;
    img.onerror = () => { img.style.display = "none"; };
    img.classList.remove("d-none");
  }

  const bodyText = a.body || a.excerpt || "Full article not available.";
  const paras = bodyText.split(/\n+/).filter((p) => p.trim());
  document.getElementById("articleBody").innerHTML = paras.length
    ? paras.map((p) => `<p>${escapeHtml(p.trim())}</p>`).join("")
    : `<p>${escapeHtml(bodyText)}</p>`;

  // Read full article link
  if (a.url) {
    const bodyEl = document.getElementById("articleBody");
    bodyEl.innerHTML += `<p style="margin-top:1.5rem"><a href="${a.url}" target="_blank" rel="noopener" style="color:var(--accent)"><i class="bi bi-box-arrow-up-right me-1"></i>Read full article on source site</a></p>`;
  }

  document.getElementById("articleActions").style.display = "flex";
  document.getElementById("shareTwitter").href =
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(a.title)}&url=${encodeURIComponent(location.href)}`;
  document.getElementById("shareFacebook").href =
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.href)}`;
}

function renderBiasMeter(a) {
  const bias = BiasStrategy.resolve(a.bias || "center");
  document.getElementById("biasMeterCard").style.display = "block";
  document.getElementById("biasSourceName").textContent = a.source;
  document.getElementById("biasDescription").textContent = `This source leans ${bias.label}.`;
  setTimeout(() => {
    document.getElementById("biasIndicator").style.left = `${bias.pct}%`;
  }, 400);
}

async function renderRelated(a) {
  let related = [];
  try {
    const data = await ApiService.getArticles({ per_page: 10 });
    const items = Array.isArray(data) ? data : data.articles || [];
    related = items
      .filter((x) => String(x.id) !== String(a.id))
      .slice(0, 3)
      .map((x) => ({
        id: x.id,
        title: x.title,
        category: x.categories?.[0]?.name || x.category || "",
        country: x.source?.country || x.country || "",
        source: x.source?.name || x.source || "",
        bias: x.source?.bias_label?.toLowerCase().replace(" ", "_") || x.bias || "center",
        image: x.image_url || x.image || `https://picsum.photos/seed/${x.id}/300/200`,
      }));
  } catch {
    return;
  }

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

async function loadComments(articleId) {
  try {
    const data = await ApiService.getComments(articleId);
    comments = Array.isArray(data) ? data : data.comments || [];
  } catch {
    comments = [];
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
  const currentUser = Auth.getUser();
  el.innerHTML = comments
    .map(
      (c) => {
        const canDelete = currentUser && (currentUser.id === c.user_id || currentUser.role === "admin");
        return `
    <div class="comment-card fade-in" id="comment-${c.id}">
      <div class="comment-header">
        <div class="comment-author">
          <div class="comment-avatar">${(c.author || c.username || "U")[0].toUpperCase()}</div>
          ${escapeHtml(c.author || c.username || "Anonymous")}
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="comment-date">${formatDate(c.created_at)}</span>
          ${canDelete ? `<button onclick="deleteComment(${c.id})" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:13px;padding:0" title="Delete comment"><i class="bi bi-trash"></i></button>` : ""}
        </div>
      </div>
      <div class="comment-body">${escapeHtml(c.text || c.content || "")}</div>
    </div>`;
      }
    )
    .join("");
}

async function deleteComment(commentId) {
  if (!confirm("Delete this comment?")) return;
  const articleId = new URLSearchParams(location.search).get("id");
  const token = localStorage.getItem("bv_token");
  try {
    const res = await fetch(`${_API_BASE}/articles/${articleId}/comments/${commentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed");
    comments = comments.filter((c) => c.id !== commentId);
    renderComments();
    showToast("Comment deleted.", "success");
  } catch {
    showToast("Could not delete comment.", "error");
  }
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