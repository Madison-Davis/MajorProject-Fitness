// ============================================================================
// charts.js — logic for charts.html
//
// Three views, each independently toggleable, all reading from the shared
// query layer (data.js: flatten() + buildIndexes()) built once on load.
// Drawing is plain Canvas 2D — no external chart library, so the app stays
// fully offline/sideload-friendly.
// ============================================================================

let QL = null; // query layer: { exercises, workouts, setLog, byExercise, byWeek, byMonth, byMuscle, exerciseById }

const state = {
  chart1: { scope: "all", metric: "volume" }, // scope: "all" | exerciseId ; metric: "volume" | "weight"
  chart2: { range: "week" }, // "week" | "month" | "all"
  chart3: { range: "week" },
};

// ---- small canvas helpers --------------------------------------------------
function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  return { ctx, w: rect.width, h: rect.height };
}

function drawBars(canvas, labels, values, color) {
  const { ctx, w, h } = setupCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  const max = Math.max(1, ...values);
  const padL = 4, padB = 20, padT = 10;
  const barW = (w - padL * 2) / values.length;

  ctx.strokeStyle = "#2a2a2e";
  ctx.beginPath();
  ctx.moveTo(padL, h - padB);
  ctx.lineTo(w - padL, h - padB);
  ctx.stroke();

  values.forEach((v, i) => {
    const barH = ((h - padB - padT) * v) / max;
    const x = padL + i * barW + barW * 0.15;
    const bw = barW * 0.7;
    ctx.fillStyle = color;
    ctx.fillRect(x, h - padB - barH, bw, barH);

    ctx.fillStyle = "#8f8f94";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(labels[i], x + bw / 2, h - 6);
  });
}

function drawLine(canvas, labels, values, color) {
  const { ctx, w, h } = setupCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  if (!values.length) return;
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const padL = 4, padB = 20, padT = 10;
  const stepX = (w - padL * 2) / Math.max(1, values.length - 1);

  ctx.strokeStyle = "#2a2a2e";
  ctx.beginPath();
  ctx.moveTo(padL, h - padB);
  ctx.lineTo(w - padL, h - padB);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = padL + i * stepX;
    const y = h - padB - ((h - padB - padT) * (v - min)) / (max - min || 1);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = color;
  values.forEach((v, i) => {
    const x = padL + i * stepX;
    const y = h - padB - ((h - padB - padT) * (v - min)) / (max - min || 1);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#8f8f94";
  ctx.font = "10px Inter, sans-serif";
  ctx.textAlign = "center";
  labels.forEach((l, i) => {
    if (i % Math.ceil(labels.length / 6 || 1) !== 0) return;
    ctx.fillText(l, padL + i * stepX, h - 6);
  });
}

// ---- Chart 1: progression per exercise -------------------------------------
function renderChart1() {
  const { scope, metric } = state.chart1;
  const byDay = new Map();

  const rows =
    scope === "all" ? QL.setLog : QL.byExercise.get(scope) || [];

  for (const r of rows) {
    if (!byDay.has(r.day)) byDay.set(r.day, { volume: 0, maxWeight: 0 });
    const d = byDay.get(r.day);
    d.volume += (r.weight || 0) * r.reps || r.reps; // bodyweight: count reps as volume
    d.maxWeight = Math.max(d.maxWeight, r.weight || 0);
  }

  const days = [...byDay.keys()].sort();
  const values = days.map((d) =>
    metric === "volume" ? byDay.get(d).volume : byDay.get(d).maxWeight
  );

  drawLine(document.getElementById("chart1-canvas"), days.map(shortDate), values, "#e3342e");
}

// ---- Chart 2: muscle % breakdown -------------------------------------------
function renderChart2() {
  const rows = filterByRange(QL.setLog, state.chart2.range);
  const totals = new Map();
  let grandTotal = 0;

  for (const r of rows) {
    const ex = QL.exerciseById.get(r.exerciseId);
    if (!ex) continue;
    for (const m of ex.primaryMuscles || []) addTo(totals, m, 1);
    for (const m of ex.secondaryMuscles || []) addTo(totals, m, 0.5);
  }
  for (const v of totals.values()) grandTotal += v;

  const muscles = [...totals.keys()].sort((a, b) => totals.get(b) - totals.get(a));
  const pcts = muscles.map((m) => Math.round((totals.get(m) / (grandTotal || 1)) * 100));

  drawBars(document.getElementById("chart2-canvas"), muscles, pcts, "#e3342e");
}

// ---- Chart 3: avg sets per muscle group -------------------------------------
function renderChart3() {
  const rows = filterByRange(QL.setLog, state.chart3.range);
  const weekCount = new Set(rows.map((r) => r.week)).size || 1;
  const totals = new Map();

  for (const r of rows) {
    const ex = QL.exerciseById.get(r.exerciseId);
    if (!ex) continue;
    for (const m of ex.primaryMuscles || []) addTo(totals, m, 1);
    for (const m of ex.secondaryMuscles || []) addTo(totals, m, 0.5);
  }

  const muscles = [...totals.keys()].sort((a, b) => totals.get(b) - totals.get(a));
  // "all" range: show raw totals, not averaged per week
  const divisor = state.chart3.range === "all" ? 1 : weekCount;
  const avgs = muscles.map((m) => Math.round((totals.get(m) / divisor) * 10) / 10);

  drawBars(document.getElementById("chart3-canvas"), muscles, avgs, "#e3342e");
}

// ---- shared helpers ---------------------------------------------------------
function addTo(map, key, n) {
  map.set(key, (map.get(key) || 0) + n);
}

function filterByRange(setLog, range) {
  if (range === "all") return setLog;
  const now = new Date();
  if (range === "week") {
    const wk = isoWeek(now.toISOString().slice(0, 10));
    return setLog.filter((r) => r.week === wk);
  }
  if (range === "month") {
    const mo = now.toISOString().slice(0, 7);
    return setLog.filter((r) => r.month === mo);
  }
  return setLog;
}

function shortDate(d) {
  return d.slice(5); // "MM-DD"
}

// ---- toggle wiring ------------------------------------------------------
function wireToggle(groupId, stateObj, key, onChange) {
  const group = document.getElementById(groupId);
  group.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      group.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      stateObj[key] = btn.dataset.value;
      onChange();
    });
  });
}

function populateExerciseSelect() {
  const sel = document.getElementById("chart1-exercise-select");
  sel.innerHTML =
    `<option value="all">All exercises</option>` +
    QL.exercises.map((e) => `<option value="${e.id}">${e.name}</option>`).join("");
  sel.addEventListener("change", () => {
    state.chart1.scope = sel.value;
    renderChart1();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  renderNav("charts");
  await ensureSeeded();
  QL = buildQueryLayer();

  populateExerciseSelect();
  wireToggle("chart1-metric-toggle", state.chart1, "metric", renderChart1);
  wireToggle("chart2-range-toggle", state.chart2, "range", renderChart2);
  wireToggle("chart3-range-toggle", state.chart3, "range", renderChart3);

  renderChart1();
  renderChart2();
  renderChart3();
});