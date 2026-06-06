/**
 * api.js — API Service Layer
 *
 * ARCHITECTURAL PATTERN: Layered Architecture
 * DESIGN PATTERN 1: Observer (EventBus)
 * DESIGN PATTERN 2: Strategy (BiasStrategy)
 */

const API_BASE = "https://newsportal-3pyx.onrender.com/api";

// ─── OBSERVER PATTERN — EventBus ─────────────
const EventBus = (() => {
  const listeners = {};
  return {
    on(event, fn) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(fn);
    },
    off(event, fn) {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter((l) => l !== fn);
    },
    emit(event, data) {
      (listeners[event] || []).forEach((fn) => fn(data));
    },
  };
})();

// ─── STRATEGY PATTERN — Bias Visualisation ───
const BiasStrategy = {
  resolve(biasScore) {
    const map = {
      far_left: {
        label: "Far Left",
        cssClass: "bias-far-left",
        color: "#1a5276",
        pct: 5,
      },
      left: { label: "Left", cssClass: "bias-left", color: "#2980b9", pct: 25 },
      center: {
        label: "Center",
        cssClass: "bias-center",
        color: "#27ae60",
        pct: 50,
      },
      right: {
        label: "Right",
        cssClass: "bias-right",
        color: "#e67e22",
        pct: 75,
      },
      far_right: {
        label: "Far Right",
        cssClass: "bias-far-right",
        color: "#922b21",
        pct: 95,
      },
    };
    if (typeof biasScore === "string" && map[biasScore]) return map[biasScore];
    if (typeof biasScore === "number") {
      if (biasScore <= -1.5) return map["far_left"];
      if (biasScore <= -0.5) return map["left"];
      if (biasScore <= 0.5) return map["center"];
      if (biasScore <= 1.5) return map["right"];
      return map["far_right"];
    }
    return map["center"];
  },
};

// ─── API SERVICE ──────────────────────────────
const ApiService = (() => {
  function getHeaders(auth = false) {
    const h = { "Content-Type": "application/json" };
    if (auth) {
      const token = localStorage.getItem("bv_token");
      if (token) h["Authorization"] = `Bearer ${token}`;
    }
    return h;
  }

  async function request(method, path, body = null, auth = false) {
    const opts = { method, headers: getHeaders(auth) };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json();
    if (!res.ok)
      throw new Error(
        data.message || data.error || data.msg || `HTTP ${res.status}`,
      );
    return data;
  }

  return {
    login: (email, password) =>
      request("POST", "/auth/login", { email, password }),
    register: (username, email, password, country, language) =>
      request("POST", "/auth/register", {
        username,
        email,
        password,
        country,
        language,
      }),
    me: () => request("GET", "/auth/me", null, true),
    getArticles: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request("GET", `/articles/${q ? "?" + q : ""}`);
    },
    getArticle: (id) => request("GET", `/articles/${id}`),
    saveArticle: (id) => request("POST", `/articles/${id}/save`, null, true),
    unsaveArticle: (id) =>
      request("DELETE", `/articles/${id}/save`, null, true),
    getSavedArticles: () => request("GET", "/articles/saved", null, true),
    getSources: () => request("GET", "/sources/"),
    getBiasSpectrum: () => request("GET", "/sources/spectrum"),
    getCategories: () => request("GET", "/categories/"),
  };
})();

// ─── MOCK DATA ────────────────────────────────
const MOCK = {
  countries: {
    Bosnia:     { name: 'Bosnia & Herzegovina', flag: '🇧🇦', color: '#2980b9', code: 'ba', altCode: 'bosnia and herzegovina' },
    Serbia:     { name: 'Serbia',               flag: '🇷🇸', color: '#c0392b', code: 'rs', altCode: 'serbia' },
    Croatia:    { name: 'Croatia',              flag: '🇭🇷', color: '#e74c3c', code: 'hr', altCode: 'croatia' },
    Slovenia:   { name: 'Slovenia',             flag: '🇸🇮', color: '#27ae60', code: 'si', altCode: 'slovenia' },
    Montenegro: { name: 'Montenegro',           flag: '🇲🇪', color: '#8e44ad', code: 'me', altCode: 'montenegro' },
    NorthMacedonia: { name: 'North Macedonia',  flag: '🇲🇰', color: '#f39c12', code: 'mk', altCode: 'north macedonia' },
    Kosovo:     { name: 'Kosovo',               flag: '🇽🇰', color: '#2c3e50', code: 'xk', altCode: 'kosovo' },
  },
  articles: [
    {
      id: 1,
      title: "Bosnia Advances EU Accession Talks After Constitutional Reform",
      excerpt:
        "The EU Commission welcomed Bosnia's latest package of constitutional reforms, moving the country closer to candidate status.",
      country: "Bosnia",
      category: "Politics",
      source: "Al Jazeera Balkans",
      bias: "center",
      image: "https://picsum.photos/seed/ba1/600/400",
      published_at: "2025-06-05T08:30:00Z",
      body: 'Bosnia and Herzegovina took a significant step forward in its European Union membership bid on Thursday, after the country\'s parliament approved a sweeping set of constitutional amendments that Brussels had long demanded.\n\nThe reforms, which address the structure of government and minority representation, were passed with a broad parliamentary majority — a rare feat in a country whose three-entity governance structure has historically made legislative progress slow.\n\nEU enlargement commissioner Marta Kos called the vote "a historic moment" and said the Commission would now recommend the opening of a new cluster of accession chapters.\n\nThe vote was the culmination of months of negotiations brokered by EU and US envoys. Opposition parties criticised several provisions but ultimately allowed the vote to proceed without a quorum block.',
    },
    {
      id: 2,
      title: "Serbia and Kosovo Resume Normalisation Dialogue in Brussels",
      excerpt:
        "The two sides met for the first time in six months under EU mediation, with modest expectations but cautious optimism.",
      country: "Serbia",
      category: "Diplomacy",
      source: "N1 Info",
      bias: "left",
      image: "https://picsum.photos/seed/rs2/600/400",
      published_at: "2025-06-04T14:00:00Z",
      body: 'Serbian and Kosovar negotiators sat across from each other in Brussels on Wednesday for the first direct talks in half a year, seeking to revive a normalisation agreement that has been stalled since 2023.\n\nEU foreign policy chief Kaja Kallas chaired the session, which EU officials described as "exploratory." Neither side made concrete commitments, but both agreed to meet again within the month.\n\nBelgrade has continued to refuse formal recognition of Kosovo\'s independence, while Pristina insists that the 2023 Ohrid Agreement must be implemented in full before any further concessions.',
    },
    {
      id: 3,
      title: "Croatia Sees Record Tourism Numbers in Early Summer Season",
      excerpt:
        "The Croatian Tourist Board reports a 12% increase in arrivals compared to 2024, driven by growth in Asian and US markets.",
      country: "Croatia",
      category: "Economy",
      source: "HRT",
      bias: "center",
      image: "https://picsum.photos/seed/hr3/600/400",
      published_at: "2025-06-04T10:15:00Z",
      body: "Croatia's tourism industry is on track for its best year on record, according to figures released by the Croatian Tourist Board on Thursday.\n\nArrival numbers for May 2025 were 12% higher than in May 2024, with particularly strong growth from South Korean, Japanese, and American visitors. The Dalmatian coast and Istria led the gains, while Zagreb also saw a significant uptick in city-break tourism.",
    },
    {
      id: 4,
      title: "Slovenia Proposes Balkan Green Energy Corridor at Vienna Summit",
      excerpt:
        "Prime Minister Golob put forward a joint renewable energy grid connecting ex-Yugoslav states to EU networks.",
      country: "Slovenia",
      category: "Energy",
      source: "STA",
      bias: "center",
      image: "https://picsum.photos/seed/si4/600/400",
      published_at: "2025-06-03T16:45:00Z",
      body: "Slovenian Prime Minister Robert Golob used a regional summit in Vienna on Monday to unveil a proposal for a coordinated Balkan green energy corridor that would link renewable energy producers across former Yugoslav states to the EU grid.\n\nThe initiative envisions joint investment in solar and wind capacity in Bosnia, Montenegro, and North Macedonia, with Slovenia acting as the transmission hub into Central Europe.",
    },
    {
      id: 5,
      title:
        "Montenegro Corruption Trial Enters Final Phase After Years of Delays",
      excerpt:
        "The high-profile case against former officials enters its closing arguments stage, a test for the country's rule-of-law reforms.",
      country: "Montenegro",
      category: "Justice",
      source: "RTCG",
      bias: "right",
      image: "https://picsum.photos/seed/me5/600/400",
      published_at: "2025-06-03T09:00:00Z",
      body: "A landmark corruption trial involving former senior Montenegrin officials moved into its closing arguments phase on Tuesday, after a case that has dragged on for nearly four years and become a symbol of the country's halting judicial reforms.\n\nThe defendants, who include a former deputy prime minister and two ex-ministers, are accused of awarding state contracts in exchange for kickbacks totalling over €3 million.",
    },
    {
      id: 6,
      title: "North Macedonia Hosts Regional Youth Sports Festival in Skopje",
      excerpt:
        "Athletes from all seven ex-Yugoslav nations compete in a week-long event aimed at building cross-border ties among young people.",
      country: "NorthMacedonia",
      category: "Culture",
      source: "MRT",
      bias: "center",
      image: "https://picsum.photos/seed/mk6/600/400",
      published_at: "2025-06-02T12:00:00Z",
      body: "Skopje welcomed more than 2,000 young athletes from across the Western Balkans on Sunday for the opening of the third annual Balkan Youth Sports Festival, a week-long competition designed to foster regional cooperation and people-to-people contacts.",
    },
    {
      id: 7,
      title:
        "Kosovo Parliament Approves New Investment Law to Attract Foreign Capital",
      excerpt:
        "The legislation simplifies licensing procedures and offers tax incentives aimed at boosting FDI in the country's tech sector.",
      country: "Kosovo",
      category: "Economy",
      source: "RTK Live",
      bias: "center",
      image: "https://picsum.photos/seed/xk7/600/400",
      published_at: "2025-06-01T11:30:00Z",
      body: "Kosovo's parliament approved a new foreign investment law on Friday that streamlines the licensing process for international companies and introduces a package of tax incentives targeted at the technology and renewable energy sectors.",
    },
    {
      id: 8,
      title: "Flood Warnings Issued Across Bosnia as River Levels Rise",
      excerpt:
        "Authorities in several cantons have activated emergency protocols after heavy rain pushed the Sava and Una rivers above warning levels.",
      country: "Bosnia",
      category: "Environment",
      source: "Klix.ba",
      bias: "left",
      image: "https://picsum.photos/seed/ba8/600/400",
      published_at: "2025-06-01T07:00:00Z",
      body: "Civil protection authorities in Bosnia and Herzegovina issued flood warnings for six cantons on Thursday after three days of intense rainfall sent the Sava, Una, and Vrbas rivers above their warning levels.\n\nResidents in low-lying areas along the Sava in Posavina Canton were advised to prepare for possible evacuation, while authorities in Bihać reported that the Una had reached its highest level in a decade.",
    },
    {
      id: 9,
      title:
        "Serbia Launches High-Speed Rail Project Linking Belgrade to Novi Sad",
      excerpt:
        "Construction begins on a major infrastructure project that will cut travel time between the two cities to under 30 minutes.",
      country: "Serbia",
      category: "Economy",
      source: "RTS",
      bias: "right",
      image: "https://picsum.photos/seed/rs9/600/400",
      published_at: "2025-05-31T09:00:00Z",
      body: "Serbia has officially broken ground on a high-speed rail extension that will connect Belgrade and Novi Sad with a journey time of under 30 minutes, the government announced on Friday.\n\nThe project, valued at €2.1 billion, is being financed through a combination of EU pre-accession funds and a bilateral loan agreement. Critics have raised concerns about transparency in the procurement process.",
    },
    {
      id: 10,
      title: "Croatia Joins New NATO Cyber Defence Framework",
      excerpt:
        "Zagreb signed onto the alliance's expanded cybersecurity protocol alongside six other member states at a summit in Brussels.",
      country: "Croatia",
      category: "Diplomacy",
      source: "Index.hr",
      bias: "left",
      image: "https://picsum.photos/seed/hr10/600/400",
      published_at: "2025-05-30T14:00:00Z",
      body: "Croatia became one of seven NATO member states to sign the alliance's new expanded cyber defence framework at a summit in Brussels on Thursday.\n\nThe agreement commits signatories to increased information-sharing on threat intelligence and joint incident response protocols. Defence Minister Ivan Anušić called it a significant step in strengthening Croatia's digital sovereignty.",
    },
  ],
  sources: [
    {
      id: 1,
      name: "N1 Info",
      country: "Serbia",
      bias: "left",
      description:
        "Independent cable news, Serbia's CNN affiliate. Generally centre-left.",
      articles: 245,
    },
    {
      id: 2,
      name: "Klix.ba",
      country: "Bosnia",
      bias: "center",
      description: "Bosnia's most visited news portal. Broadly centrist.",
      articles: 312,
    },
    {
      id: 3,
      name: "HRT",
      country: "Croatia",
      bias: "right",
      description: "Croatian public broadcaster. Editorially conservative.",
      articles: 198,
    },
    {
      id: 4,
      name: "Al Jazeera Balkans",
      country: "Regional",
      bias: "center",
      description:
        "Regional arm of Al Jazeera. Balanced coverage of Balkan politics.",
      articles: 175,
    },
    {
      id: 5,
      name: "RTCG",
      country: "Montenegro",
      bias: "right",
      description: "Montenegrin public broadcaster. Pro-government tendency.",
      articles: 134,
    },
    {
      id: 6,
      name: "MRT",
      country: "NorthMacedonia",
      bias: "center",
      description: "North Macedonia public broadcaster. Generally neutral.",
      articles: 120,
    },
    {
      id: 7,
      name: "RTK Live",
      country: "Kosovo",
      bias: "left",
      description: "Kosovo public broadcaster. Pro-integration.",
      articles: 109,
    },
    {
      id: 8,
      name: "STA",
      country: "Slovenia",
      bias: "center",
      description: "Slovenian Press Agency. Wire service, objective.",
      articles: 160,
    },
    {
      id: 9,
      name: "Večernje Novosti",
      country: "Serbia",
      bias: "far_right",
      description: "Serbian daily with strong nationalist editorial line.",
      articles: 89,
    },
    {
      id: 10,
      name: "Index.hr",
      country: "Croatia",
      bias: "left",
      description:
        "Popular Croatian online portal. Centre-left on social issues.",
      articles: 203,
    },
    {
      id: 11,
      name: "RTS",
      country: "Serbia",
      bias: "right",
      description: "Serbian public broadcaster. Close to the government.",
      articles: 178,
    },
  ],
  categories: [
    "Politics",
    "Economy",
    "Culture",
    "Diplomacy",
    "Environment",
    "Justice",
    "Energy",
    "Society",
  ],
};

// ─── UTILS shared across all pages ────────────
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
function countryFlag(c) {
  return (MOCK.countries[c] || {}).flag || "";
}
function escapeHtml(s) {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
// Resolve article path relative to current page
function articlePath(id) {
  const onRoot = !location.pathname.includes("/pages/");
  return onRoot ? `pages/article.html?id=${id}` : `article.html?id=${id}`;
}
function countryPath(c) {
  const onRoot = !location.pathname.includes("/pages/");
  return onRoot
    ? `pages/country.html?country=${c}`
    : `country.html?country=${c}`;
}
