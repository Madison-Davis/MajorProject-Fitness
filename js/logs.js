// ============================================================================
// logs.js — logic for logs.html ("give me a given workout")
// ============================================================================

function renderLogs() {
  const root = document.getElementById("logs-root");
  const workouts = loadWorkouts().sort((a, b) => b.day.localeCompare(a.day));
  const exById = new Map(loadExercises().map((e) => [e.id, e]));

  if (!workouts.length) {
    root.innerHTML = `<div class="empty"><span class="num-lg">—</span><p>No logged workouts yet.</p></div>`;
    return;
  }

  root.innerHTML = `<div class="row-list">${workouts
    .map((w) => {
      const totalSets = w.stations.reduce((n, s) => n + s.sets.length, 0);
      const exerciseNames = w.stations
        .map((s) => exById.get(s.exerciseId)?.name || s.exerciseId)
        .join(", ");
      return `
      <button class="row" style="width:100%; text-align:left;" onclick="toggleDetail('${w.day}')">
        <div>
          <div class="row-title">${w.day}</div>
          <div class="row-sub">${totalSets} sets · ${exerciseNames}</div>
        </div>
      </button>
      <div id="detail-${w.day}" class="row-sub" style="display:none; padding:0 4px 14px;">
        ${w.stations
          .map(
            (s) => `
          <div style="margin-top:6px;">
            <strong style="color:var(--text);">${exById.get(s.exerciseId)?.name || s.exerciseId}</strong><br>
            ${s.sets.map((set) => `${set.weight ?? "BW"}&times;${set.reps}`).join("  ")}
          </div>`
          )
          .join("")}
      </div>`;
    })
    .join("")}</div>`;
}

function toggleDetail(day) {
  const el = document.getElementById(`detail-${day}`);
  el.style.display = el.style.display === "none" ? "block" : "none";
}

document.addEventListener("DOMContentLoaded", async () => {
  renderNav("logs");
  await ensureSeeded();
  renderLogs();
});