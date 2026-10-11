// ============================================================================
// logs.js — logic for logs.html (calendar view of past workouts)
// ============================================================================

const MUSCLE_SUPERGROUPS = {
  upper: ["biceps", "triceps", "deltoid", "back"],
  lower: ["quads", "hams", "calves", "core", "chest"],
};

let calState = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(), // 0-indexed
  selectedDay: todayStr(),
  collapsed: false,
};

let workoutsByDay = new Map(); // "YYYY-MM-DD" -> workout
let exById = new Map();

// ---- derived display helpers ------------------------------------------------
function workoutVolume(workout) {
  let total = 0;
  for (const station of workout.stations) {
    for (const set of station.sets) {
      total += (set.weight || 0) * set.reps || set.reps;
    }
  }
  return total;
}

function workoutDurationMinutes(workout) {
  if (!workout.startTime || !workout.endTime) return null;
  const [sh, sm] = workout.startTime.split(":").map(Number);
  const [eh, em] = workout.endTime.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

/** Labels a workout like "Lower (Quads)" from which muscles actually got hit,
 *  using your own upper/lower grouping — no extra field needed on Workout. */
function workoutLabel(workout) {
  const muscleCounts = new Map();
  for (const station of workout.stations) {
    const ex = exById.get(station.exerciseId);
    if (!ex) continue;
    for (const m of ex.primaryMuscles || []) {
      muscleCounts.set(m, (muscleCounts.get(m) || 0) + station.sets.length);
    }
  }
  if (!muscleCounts.size) return "Workout";

  let topMuscle = null, topCount = -1;
  for (const [m, c] of muscleCounts) {
    if (c > topCount) { topMuscle = m; topCount = c; }
  }

  const group = MUSCLE_SUPERGROUPS.upper.includes(topMuscle) ? "Upper" : "Lower";
  const label = topMuscle.charAt(0).toUpperCase() + topMuscle.slice(1);
  return `${group} (${label})`;
}

// ---- calendar rendering -----------------------------------------------------
function pad2(n) { return String(n).padStart(2, "0"); }

function dayStrFor(year, month, date) {
  return `${year}-${pad2(month + 1)}-${pad2(date)}`;
}

function renderMonthLabel() {
  const names = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  document.getElementById("month-label").textContent = `${names[calState.month]} ${calState.year}`;
}

function renderCalendarGrid() {
  const grid = document.getElementById("calendar-grid");
  const { year, month } = calState;
  const firstWeekday = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = todayStr();

  const rows = [];
  for (let r = 0; r < cells.length; r += 7) rows.push(cells.slice(r, r + 7));

  // when collapsed, show only the row containing the selected day
  const visibleRows = calState.collapsed
    ? rows.filter((row) =>
        row.some((d) => d && dayStrFor(year, month, d) === calState.selectedDay)
      )
    : rows;

  grid.innerHTML = visibleRows
    .flat()
    .map((d) => {
      if (!d) return `<div class="day-cell"></div>`;
      const dStr = dayStrFor(year, month, d);
      const hasWorkout = workoutsByDay.has(dStr);
      const isToday = dStr === today;
      const isSelected = dStr === calState.selectedDay;
      const classes = [
        "day-cell",
        hasWorkout ? "has-workout" : "",
        isToday ? "is-today" : "",
        isSelected ? "is-selected" : "",
      ].join(" ").trim();
      return `
        <button class="${classes}" data-day="${dStr}">
          <span class="day-num">${d}</span>
          ${hasWorkout ? '<span class="day-dot"></span>' : ""}
        </button>`;
    })
    .join("");

  grid.querySelectorAll(".day-cell[data-day]").forEach((btn) => {
    btn.addEventListener("click", () => {
      calState.selectedDay = btn.dataset.day;
      renderCalendar();
      renderDayDetail();
    });
  });
}

function renderCalendar() {
  renderMonthLabel();
  renderCalendarGrid();
  document.getElementById("collapse-btn")
    .querySelector(".collapse-caret").innerHTML = calState.collapsed ? "&#9662;" : "&#9652;";
}

// ---- selected-day detail panel ----------------------------------------------
function formatSelectedDayHeading(dStr) {
  const [y, m, d] = dStr.split("-").map(Number);
  const names = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return `${names[m - 1]} ${d}, ${y}`;
}

function renderDayDetail() {
  const root = document.getElementById("day-detail-root");
  const dStr = calState.selectedDay;
  const workout = workoutsByDay.get(dStr);

  if (!workout) {
    root.innerHTML = `
      <div class="day-detail-heading">${formatSelectedDayHeading(dStr)}</div>
      <div class="empty"><span class="num-lg">—</span><p>No workout logged this day.</p></div>`;
    return;
  }

  const duration = workoutDurationMinutes(workout);
  const volume = workoutVolume(workout);

  root.innerHTML = `
    <div class="day-detail-heading">${formatSelectedDayHeading(dStr)}</div>
    <button class="workout-summary-card" id="summary-toggle">
      <div>
        <div class="row-title">${workoutLabel(workout)}</div>
        <div class="row-sub">Completed ${workout.stations.length} exercise${workout.stations.length === 1 ? "" : "s"}${
          duration != null ? ` in ${duration} minutes` : ""
        }</div>
        <div class="row-sub">Training Volume: ${volume.toLocaleString()}</div>
      </div>
      <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 6l6 6-6 6"/>
      </svg>
    </button>
    <div id="summary-expanded" style="display:none;" class="row-sub">
      ${workout.stations
        .map(
          (s) => `
        <div style="margin:10px 4px;">
          <strong style="color:var(--text);">${exById.get(s.exerciseId)?.name || s.exerciseId}</strong><br>
          ${s.sets.map((set) => `${set.weight ?? "BW"}&times;${set.reps}`).join("  ")}
        </div>`
        )
        .join("")}
    </div>`;

  document.getElementById("summary-toggle").addEventListener("click", () => {
    const expanded = document.getElementById("summary-expanded");
    expanded.style.display = expanded.style.display === "none" ? "block" : "none";
  });
}

// ---- wiring -------------------------------------------------------------
function loadWorkoutsByDay() {
  workoutsByDay = new Map(loadWorkouts().map((w) => [w.day, w]));
}

function goToToday() {
  const now = new Date();
  calState.year = now.getFullYear();
  calState.month = now.getMonth();
  calState.selectedDay = todayStr();
  calState.collapsed = false;
  renderCalendar();
  renderDayDetail();
}

document.addEventListener("DOMContentLoaded", async () => {
  renderTopbar("Logs", { leftLabel: "Today", onLeftClick: goToToday });
  renderNav("logs");
  await ensureSeeded();

  exById = new Map(loadExercises().map((e) => [e.id, e]));
  loadWorkoutsByDay();

  renderCalendar();
  renderDayDetail();

  document.getElementById("prev-month").addEventListener("click", () => {
    calState.month -= 1;
    if (calState.month < 0) { calState.month = 11; calState.year -= 1; }
    renderCalendar();
  });

  document.getElementById("next-month").addEventListener("click", () => {
    calState.month += 1;
    if (calState.month > 11) { calState.month = 0; calState.year += 1; }
    renderCalendar();
  });

  document.getElementById("collapse-btn").addEventListener("click", () => {
    calState.collapsed = !calState.collapsed;
    renderCalendar();
  });

  // "+" currently routes to starting a live workout (the only logging flow
  // this app has); wire it to a dedicated past-date log form if you add one.
  document.getElementById("add-log-fab").addEventListener("click", () => {
    window.location.href = "index.html";
  });
});

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}