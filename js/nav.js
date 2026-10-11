// ============================================================================
// nav.js — shared chrome used by every page: the top header bar and the
// bottom tab bar. Both are rendered from here so a page never hand-writes
// its own header markup — call renderTopbar(title, opts) once per page and
// every page stays visually identical by construction, not by copy-paste.
// ============================================================================

const TABS = [
  {
    id: "workout",
    href: "index.html",
    label: "Workout",
    icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  },
  {
    id: "exercises",
    href: "exercises.html",
    label: "Exercises",
    icon: '<path d="M6 7v10M18 7v10M3 12h18M9 9v6M15 9v6"/>',
  },
  {
    id: "logs",
    href: "logs.html",
    label: "Logs",
    icon: '<path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  },
  {
    id: "charts",
    href: "charts.html",
    label: "Charts",
    icon: '<path d="M4 20V10M12 20V4M20 20v-7"/>',
  },
];

const GEAR_ICON =
  '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>';

/**
 * Renders the shared red topbar. Call once per page, before or after
 * renderNav() — order doesn't matter, one prepends and one appends.
 *
 * opts.leftLabel / opts.onLeftClick: optional left-side action (e.g. Logs'
 *   "Today" button). Omit both for pages with no left action — a hidden
 *   placeholder keeps the title centered either way.
 * The right-side gear is always rendered but currently inert (disabled) —
 * there's no settings page yet to route it to.
 */
function renderTopbar(title, opts = {}) {
  const bar = document.createElement("div");
  bar.className = "topbar";
  bar.innerHTML = `
    <button class="topbar-left-btn" ${opts.onLeftClick ? "" : "hidden"}>${opts.leftLabel || ""}</button>
    <h1 class="topbar-title">${title}</h1>
    <button class="icon-btn" aria-label="Settings" disabled>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${GEAR_ICON}</svg>
    </button>`;
  document.body.insertBefore(bar, document.body.firstChild);

  if (opts.onLeftClick) {
    bar.querySelector(".topbar-left-btn").addEventListener("click", opts.onLeftClick);
  }
}

function renderNav(activeId) {
  const nav = document.createElement("nav");
  nav.className = "tabbar";
  nav.innerHTML = TABS.map(
    (t) => `
    <a href="${t.href}" class="${t.id === activeId ? "active" : ""}">
      <svg viewBox="0 0 24 24">${t.icon}</svg>
      <span>${t.label}</span>
    </a>`
  ).join("");
  document.body.appendChild(nav);
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  });
}