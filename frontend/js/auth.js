/**
 * auth.js — Authentication state management
 * Observer pattern: broadcasts auth changes via EventBus
 */

const Auth = (() => {
  let currentUser = null;

  function getToken() {
    return localStorage.getItem("bv_token");
  }
  function setToken(t) {
    localStorage.setItem("bv_token", t);
  }
  function clearToken() {
    localStorage.removeItem("bv_token");
    localStorage.removeItem("bv_user");
    currentUser = null;
  }

  function getUser() {
    if (currentUser) return currentUser;
    try {
      return JSON.parse(localStorage.getItem("bv_user"));
    } catch {
      return null;
    }
  }
  function setUser(u) {
    currentUser = u;
    localStorage.setItem("bv_user", JSON.stringify(u));
  }

  function isLoggedIn() {
    return !!getToken() && !!getUser();
  }

function updateNavbar() {
  const user = getUser();
  const authNav = document.getElementById("authNav");
  const userNav = document.getElementById("userNav");
  const navUsername = document.getElementById("navUsername");
  if (!authNav || !userNav) return;

  if (isLoggedIn() && user) {
    authNav.classList.add("d-none");
    userNav.classList.remove("d-none");
    if (navUsername) navUsername.textContent = user.username || user.email || "User";

    const dropdownMenu = userNav.querySelector(".dropdown-menu");
    if (dropdownMenu) {
      dropdownMenu.querySelectorAll(".role-nav-item").forEach((el) => el.remove());

      const onPages = location.pathname.includes("/pages/");
      const base = onPages ? "" : "pages/";

      let extraLinks = `<li class="role-nav-item"><a class="dropdown-item" href="${base}feed.html"><i class="bi bi-rss me-2"></i>My Feed</a></li>`;

      if (["writer", "editor", "admin"].includes(user.role)) {
        extraLinks += `<li class="role-nav-item"><a class="dropdown-item" href="${base}writer.html"><i class="bi bi-pencil-fill me-2"></i>Writer Dashboard</a></li>`;
      }

      if (["editor", "admin"].includes(user.role)) {
        extraLinks += `<li class="role-nav-item"><a class="dropdown-item" href="${base}editor.html"><i class="bi bi-journals me-2"></i>Editor Dashboard</a></li>`;
      }

      if (user.role === "admin") {
        extraLinks += `<li class="role-nav-item"><a class="dropdown-item" href="${base}admin.html"><i class="bi bi-shield-fill me-2"></i>Admin Panel</a></li>`;
      }

      extraLinks += `<li class="role-nav-item"><hr class="dropdown-divider"/></li>`;

      const logoutItem = dropdownMenu.querySelector("[onclick='logout()']")?.closest("li");
      if (logoutItem) {
        const temp = document.createElement("div");
        temp.innerHTML = `<ul>${extraLinks}</ul>`;
        [...temp.querySelector("ul").children].forEach((el) => {
          dropdownMenu.insertBefore(el, logoutItem);
        });
      }
    }
  } else {
    authNav.classList.remove("d-none");
    userNav.classList.add("d-none");
  }
}

  // Only verify token if we have one stored — never clear on network failure
  async function tryAutoLogin() {
    const token = getToken();
    const storedUser = getUser();
    if (!token || !storedUser) {
      updateNavbar();
      return;
    }
    // Restore from localStorage immediately (no network needed)
    currentUser = storedUser;
    updateNavbar();
    // Then try to refresh from server in background, but DON'T clear on failure
    try {
      const data = await ApiService.me();
      setUser(data);
      EventBus.emit("auth:changed", { loggedIn: true, user: data });
      updateNavbar();
    } catch {
      // Server unreachable or token expired — keep user logged in with cached data
      // Only clear if we get a 401
    }
  }

  EventBus.on("auth:changed", () => updateNavbar());

  return {
    getToken,
    getUser,
    isLoggedIn,
    setToken,
    setUser,
    clearToken,
    updateNavbar,
    tryAutoLogin,
  };
})();

// ─── Modal helpers ────────────────────────────
function showModal(id) {
  const el = document.getElementById(id);
  if (el) bootstrap.Modal.getOrCreateInstance(el).show();
}
function switchModal(hideId, showId) {
  const hide = document.getElementById(hideId);
  const show = document.getElementById(showId);
  if (hide) bootstrap.Modal.getInstance(hide)?.hide();
  setTimeout(() => {
    if (show) bootstrap.Modal.getOrCreateInstance(show).show();
  }, 300);
}
function showError(elId, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("d-none");
}
function hideError(elId) {
  const el = document.getElementById(elId);
  if (el) el.classList.add("d-none");
}

// ─── Login (used on login page AND modal) ─────
async function doLogin(redirectTo) {
  hideError("loginError");
  const email = document.getElementById("loginEmail")?.value?.trim();
  const password = document.getElementById("loginPassword")?.value;
  if (!email || !password) {
    showError("loginError", "Please fill all fields.");
    return;
  }

  const btn = document.getElementById("loginSubmitBtn");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML =
      '<span class="spinner-border spinner-border-sm"></span> Signing in…';
  }

  try {
    const data = await ApiService.login(email, password);
    Auth.setToken(data.access_token || data.token);
    Auth.setUser(data.user || { email, username: email.split("@")[0] });
    EventBus.emit("auth:changed", { loggedIn: true, user: Auth.getUser() });

    // Close modal if open
    const modal = document.getElementById("loginModal");
    if (modal) bootstrap.Modal.getInstance(modal)?.hide();

    showToast("Welcome back!", "success");

    // Redirect
    const dest =
      redirectTo ||
      new URLSearchParams(location.search).get("redirect") ||
      null;
    if (dest) {
      setTimeout(() => {
        window.location.href = dest;
      }, 500);
    } else if (location.pathname.includes("login.html")) {
      setTimeout(() => {
        window.location.href = isOnPages() ? "../index.html" : "index.html";
      }, 500);
    }
  } catch (err) {
    showError("loginError", err.message || "Invalid email or password.");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Sign In";
    }
  }
}

// ─── Register (used on register page AND modal) ─
async function doRegister() {
  hideError("registerError");
  const username = document.getElementById("regUsername")?.value?.trim();
  const email = document.getElementById("regEmail")?.value?.trim();
  const password = document.getElementById("regPassword")?.value;
  const country = document.getElementById("regCountry")?.value;
  if (!username || !email || !password) {
    showError("registerError", "Please fill all required fields.");
    return;
  }

  const btn = document.getElementById("registerSubmitBtn");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML =
      '<span class="spinner-border spinner-border-sm"></span> Creating account…';
  }

  try {
    await ApiService.register(username, email, password, country || "", "en");

    // Show success then redirect to login page
    const successEl = document.getElementById("registerSuccess");
    if (successEl) {
      successEl.textContent = "Account created! Redirecting to login…";
      successEl.classList.remove("d-none");
    }
    showToast("Account created! Please sign in.", "success");

    const loginDest = isOnPages()
      ? "login.html?registered=1"
      : "pages/login.html?registered=1";
    setTimeout(() => {
      window.location.href = loginDest;
    }, 1200);
  } catch (err) {
    showError(
      "registerError",
      err.message || "Registration failed. Try a different email.",
    );
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Create Account";
    }
  }
}

// ─── Logout ───────────────────────────────────
function logout() {
  Auth.clearToken();
  EventBus.emit("auth:changed", { loggedIn: false });
  showToast("Signed out.", "success");
  const home = isOnPages() ? "../index.html" : "index.html";
  setTimeout(() => {
    window.location.href = home;
  }, 500);
}

// ─── Toast ────────────────────────────────────
function showToast(msg, type = "success") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const t = document.createElement("div");
  t.className = `toast-msg ${type}`;
  t.innerHTML = `<i class="bi bi-${type === "success" ? "check-circle" : "exclamation-circle"}"></i> ${msg}`;
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = "0";
    setTimeout(() => t.remove(), 400);
  }, 3000);
}

function isOnPages() {
  return location.pathname.includes("/pages/");
}
