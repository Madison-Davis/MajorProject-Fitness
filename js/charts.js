// ============================================================================
// charts.js — logic for charts.html
//
// Summary panel at top pulls numbers from across all three sections below.
// Each section draws into its own canvas: smoothed multi-line progression,
// a pie breakdown, and a goal-referenced horizontal bar chart. Plain Canvas
// 2D throughout — no external chart library, keeps the app offline-capable.
// ============================================================================

let QL = null; // query layer from data.js: { exercises, setLog, exerciseById, byWeek, byMonth, ... }

const GOAL_SETS_PER_MUSCLE = 12; // weekly target used by the summary panel and chart 3

const PALETTE = ["#e3342e", "#ff6b4a", "#f2b84b", "#c9484a", "#8f201c", "#f2f1ed", "#8f8f94", "#58585d"];

const state = {
  chart1: { metric: "volume" }, // "volume" | "weight"
  chart2: { range: "week" },    // "week" | "month" | "all"
  chart3: { range: "week" },
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ---- shared helpers ---------------------------------------------------------
function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  return { ctx, w: rect.width, h: rect.height };
}

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
  return d.slice(5);
}

function drawEmptyState(ctx, w, h) {
  ctx.fillStyle = "#8f8f94";
  ctx.font = "13px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("No data yet", w / 2, h / 2);
}

/** Primary muscles count as 1 set, secondary as 0.5 — same weighting used
 *  everywhere else in the app's volume-per-muscle math. */
function muscleTotals(range) {
  const rows = filterByRange(QL.setLog, range);
  const totals = new Map();
  for (const r of rows) {
    const ex = QL.exerciseById.get(r.exerciseId);
    if (!ex) continue;
    for (const m of ex.primaryMuscles || []) addTo(totals, m, 1);
    for (const m of ex.secondaryMuscles || []) addTo(totals, m, 0.5);
  }
  return totals;
}

// ---- Summary panel ------------------------------------------------------
function previousIsoWeek(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - 7);
  return isoWeek(d.toISOString().slice(0, 10));
}

function renderSummary() {
  const root = document.getElementById("summary-root");
  const today = todayStr();
  const thisWeek = isoWeek(today);
  const lastWeek = previousIsoWeek(today);

  const thisWeekRows = QL.byWeek.get(thisWeek) || [];
  const lastWeekRows = QL.byWeek.get(lastWeek) || [];

  const sessions = new Set(thisWeekRows.map((r) => r.day)).size;

  const volOf = (rows) =>
    rows.reduce((sum, r) => sum + ((r.weight || 0) * r.reps || r.reps), 0);
  const volThis = volOf(thisWeekRows);
  const volLast = volOf(lastWeekRows);
  const volChangePct =
    volLast > 0 ? Math.round(((volThis - volLast) / volLast) * 100) : null;

  const weekTotals = muscleTotals("week");
  let topMuscle = null,
    topVal = -1;
  for (const [m, v] of weekTotals) {
    if (v > topVal) { topMuscle = m; topVal = v; }
  }

  const allMuscles = [
    ...new Set(
      QL.exercises.flatMap((e) => [...(e.primaryMuscles || []), ...(e.secondaryMuscles || [])])
    ),
  ];
  const onGoal = allMuscles.filter((m) => (weekTotals.get(m) || 0) >= GOAL_SETS_PER_MUSCLE).length;

  root.innerHTML = `
    <div class="summary-grid">
      <div class="summary-stat">
        <div class="num-lg">${sessions}</div>
        <div class="row-sub">Sessions this week</div>
      </div>
      <div class="summary-stat">
        <div class="num-lg">${volChangePct == null ? "—" : (volChangePct >= 0 ? "+" : "") + volChangePct + "%"}</div>
        <div class="row-sub">Volume vs last week</div>
      </div>
      <div class="summary-stat">
        <div class="num-lg" style="font-size:24px;">${topMuscle ? topMuscle[0].toUpperCase() + topMuscle.slice(1) : "—"}</div>
        <div class="row-sub">Most trained muscle</div>
      </div>
      <div class="summary-stat">
        <div class="num-lg">${onGoal}/${allMuscles.length || 0}</div>
        <div class="row-sub">Muscles at ${GOAL_SETS_PER_MUSCLE}+ sets</div>
      </div>
    </div>`;
}

// ---- Chart 1: smoothed multi-line volume progression -----------------------

/** Draws a smooth curve through ALL points using Catmull-Rom-to-Bezier
 *  conversion — true spline tangents (not just midpoint-quadratic), so
 *  transitions between flat plateaus and sloped segments round off nicely
 *  instead of kinking. `dotAt` optionally marks which indices are real
 *  recorded data (vs. filled-in gap values) with a small dot. */
function drawSmoothCurve(ctx, points, color, dotAt) {
  if (!points.length) return;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  if (points.length === 1) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(points[0].x - 6, points[0].y);
    ctx.lineTo(points[0].x + 6, points[0].y);
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    ctx.stroke();
  }

  if (dotAt) {
    ctx.fillStyle = color;
    points.forEach((p, i) => {
      if (!dotAt.has(i)) return;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

/** Carries the last known value forward through days with no data for this
 *  exercise, and backfills any leading gap with the first known value — so
 *  every exercise's line spans the full chart width (not just between its
 *  own first and last logged day), and gaps read as a flat hold rather
 *  than a sharp diagonal jump to the next real point. */
function fillSeries(dayMap, allDays, metric) {
  const raw = allDays.map((day) =>
    dayMap.has(day)
      ? metric === "volume" ? dayMap.get(day).volume : dayMap.get(day).maxWeight
      : null
  );
  const firstKnownIdx = raw.findIndex((v) => v != null);
  if (firstKnownIdx === -1) return raw.map(() => 0);

  const filled = raw.slice();
  for (let i = 0; i < firstKnownIdx; i++) filled[i] = raw[firstKnownIdx];
  let last = filled[firstKnownIdx];
  for (let i = firstKnownIdx + 1; i < filled.length; i++) {
    if (filled[i] == null) filled[i] = last;
    else last = filled[i];
  }
  return filled;
}

function renderChart1() {
  const canvas = document.getElementById("chart1-canvas");
  const { ctx, w, h } = setupCanvas(canvas);
  ctx.clearRect(0, 0, w, h);

  const metric = state.chart1.metric;
  const padL = 4, padR = 4, padT = 10, padB = 20;

  const allDays = [...new Set(QL.setLog.map((r) => r.day))].sort();
  if (!allDays.length) return drawEmptyState(ctx, w, h);

  const byExercise = new Map();
  for (const r of QL.setLog) {
    if (!byExercise.has(r.exerciseId)) byExercise.set(r.exerciseId, new Map());
    const dayMap = byExercise.get(r.exerciseId);
    if (!dayMap.has(r.day)) dayMap.set(r.day, { volume: 0, maxWeight: 0 });
    const d = dayMap.get(r.day);
    d.volume += (r.weight || 0) * r.reps || r.reps;
    d.maxWeight = Math.max(d.maxWeight, r.weight || 0);
  }

  let maxVal = 1;
  for (const dayMap of byExercise.values()) {
    for (const d of dayMap.values()) {
      maxVal = Math.max(maxVal, metric === "volume" ? d.volume : d.maxWeight);
    }
  }

  const stepX = (w - padL - padR) / Math.max(1, allDays.length - 1);
  const toX = (i) => padL + i * stepX;
  const toY = (v) => h - padB - ((h - padB - padT) * v) / maxVal;

  ctx.strokeStyle = "#2a2a2e";
  ctx.beginPath();
  ctx.moveTo(padL, h - padB);
  ctx.lineTo(w - padR, h - padB);
  ctx.stroke();

  const exerciseIds = [...byExercise.keys()];
  exerciseIds.forEach((exId, idx) => {
    const dayMap = byExercise.get(exId);
    const filled = fillSeries(dayMap, allDays, metric);
    const points = filled.map((v, i) => ({ x: toX(i), y: toY(v) }));
    const realDataIndices = new Set(
      allDays.map((day, i) => (dayMap.has(day) ? i : null)).filter((i) => i !== null)
    );
    drawSmoothCurve(ctx, points, PALETTE[idx % PALETTE.length], realDataIndices);
  });

  ctx.fillStyle = "#8f8f94";
  ctx.font = "10px Inter, sans-serif";
  ctx.textAlign = "center";
  allDays.forEach((d, i) => {
    if (i % Math.ceil(allDays.length / 6 || 1) !== 0) return;
    ctx.fillText(shortDate(d), toX(i), h - 6);
  });

  document.getElementById("chart1-legend").innerHTML = exerciseIds
    .map((id, idx) => {
      const ex = QL.exerciseById.get(id);
      return `<span class="legend-item"><span class="legend-dot" style="background:${PALETTE[idx % PALETTE.length]}"></span>${ex ? ex.name : id}</span>`;
    })
    .join("");
}

// ---- Chart 2: muscle % breakdown as a pie chart -----------------------------
function renderChart2() {
  const canvas = document.getElementById("chart2-canvas");
  const { ctx, w, h } = setupCanvas(canvas);
  ctx.clearRect(0, 0, w, h);

  const totals = muscleTotals(state.chart2.range);
  const muscles = [...totals.keys()].sort((a, b) => totals.get(b) - totals.get(a));
  const grand = muscles.reduce((s, m) => s + totals.get(m), 0);

  if (!grand) return drawEmptyState(ctx, w, h);

  const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 10;
  let start = -Math.PI / 2;
  muscles.forEach((m, idx) => {
    const slice = (totals.get(m) / grand) * Math.PI * 2;
    ctx.fillStyle = PALETTE[idx % PALETTE.length];
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + slice);
    ctx.closePath();
    ctx.fill();
    start += slice;
  });

  document.getElementById("chart2-legend").innerHTML = muscles
    .map((m, idx) => {
      const pct = Math.round((totals.get(m) / grand) * 100);
      return `<span class="legend-item"><span class="legend-dot" style="background:${PALETTE[idx % PALETTE.length]}"></span>${m} ${pct}%</span>`;
    })
    .join("");
}

// ---- Chart 3: avg sets/muscle as horizontal bars with a goal line ----------
function renderChart3() {
  const canvas = document.getElementById("chart3-canvas");
  const { ctx, w, h } = setupCanvas(canvas);
  ctx.clearRect(0, 0, w, h);

  const totals = muscleTotals(state.chart3.range);
  const weekCount =
    state.chart3.range === "week"
      ? 1
      : new Set(filterByRange(QL.setLog, state.chart3.range).map((r) => r.week)).size || 1;

  const muscles = [...totals.keys()].sort((a, b) => totals.get(b) - totals.get(a));
  const avgs = muscles.map((m) => Math.round((totals.get(m) / weekCount) * 10) / 10);

  if (!muscles.length) return drawEmptyState(ctx, w, h);

  const labelW = 62, padR = 36;
  const rowH = h / muscles.length;
  const maxVal = Math.max(GOAL_SETS_PER_MUSCLE, ...avgs) * 1.15;
  const scaleX = (w - labelW - padR) / maxVal;

  muscles.forEach((label, i) => {
    const val = avgs[i];
    const barY = i * rowH + rowH * 0.28;
    const barH = rowH * 0.44;
    const barW = val * scaleX;
    const onGoal = val >= GOAL_SETS_PER_MUSCLE;

    ctx.fillStyle = "#8f8f94";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 0, i * rowH + rowH / 2);

    ctx.fillStyle = onGoal ? "#e3342e" : "#8f201c";
    ctx.fillRect(labelW, barY, barW, barH);

    ctx.fillStyle = "#f2f1ed";
    ctx.fillText(String(val), labelW + barW + 6, i * rowH + rowH / 2);
  });

  const goalX = labelW + GOAL_SETS_PER_MUSCLE * scaleX;
  ctx.strokeStyle = "#f2f1ed";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(goalX, 0);
  ctx.lineTo(goalX, h);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#f2f1ed";
  ctx.font = "10px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`Goal: ${GOAL_SETS_PER_MUSCLE}`, goalX, 10);
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

document.addEventListener("DOMContentLoaded", async () => {
  renderTopbar("Progress");
  renderNav("charts");
  await ensureSeeded();
  QL = buildQueryLayer();

  wireToggle("chart1-metric-toggle", state.chart1, "metric", renderChart1);
  wireToggle("chart2-range-toggle", state.chart2, "range", renderChart2);
  wireToggle("chart3-range-toggle", state.chart3, "range", renderChart3);

  renderSummary();
  renderChart1();
  renderChart2();
  renderChart3();
});