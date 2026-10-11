// ============================================================================
// nav.js — bottom tab bar, shared across all pages
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