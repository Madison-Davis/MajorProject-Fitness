// ============================================================================
// workout.js — logic for index.html (the "currently active workout" screen)
// ============================================================================

const ACTIVE_KEY = "fitness_active_workout"; // draft, separate from saved workouts

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  return new Date().toTimeString().slice(0, 5); // "HH:MM"
}

function getActiveWorkout() {
  const raw = localStorage.getItem(ACTIVE_KEY);
  return raw ? JSON.parse(raw) : null;
}

function setActiveWorkout(w) {
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(w));
}

function clearActiveWorkout() {
  localStorage.removeItem(ACTIVE_KEY);
}

function startWorkout() {
  setActiveWorkout({
    day: todayStr(),
    startTime: nowTime(),
    endTime: null,
    stations: [],
  });
  render();
}

function endWorkout() {
  const w = getActiveWorkout();
  if (!w) return;
  w.endTime = nowTime();
  upsertWorkout(w); // persist to the real workouts table (data.js)
  clearActiveWorkout();
  render();
}

function addStation(exerciseId) {
  const w = getActiveWorkout();
  if (!w) return;
  w.stations.push({ exerciseId, sets: [] });
  setActiveWorkout(w);
  render();
}

function addSet(stationIdx, weight, reps) {
  const w = getActiveWorkout();
  if (!w) return;
  w.stations[stationIdx].sets.push({
    weight: weight === "" ? null : Number(weight),
    reps: Number(reps),
  });
  setActiveWorkout(w);
  render();
}

function render() {
  const root = document.getElementById("workout-root");
  const w = getActiveWorkout();
  const exercises = loadExercises();
  const exById = new Map(exercises.map((e) => [e.id, e]));

  if (!w) {
    root.innerHTML = `
      <div class="empty">
        <span class="num-lg">—</span>
        <p>No active workout. Press + to start one.</p>
      </div>`;
    return;
  }

  root.innerHTML = `
    <div class="row">
      <div>
        <div class="row-title">${w.day}</div>
        <div class="row-sub">Started ${w.startTime}</div>
      </div>
      <button class="btn-danger" onclick="endWorkout()">End</button>
    </div>
    <div class="row-list">
      ${w.stations
        .map(
          (station, si) => `
        <div class="row" style="flex-direction:column; align-items:stretch;">
          <div class="row-title">${
            exById.get(station.exerciseId)?.name || station.exerciseId
          }</div>
          ${station.sets
            .map(
              (s, i) =>
                `<div class="row-sub">Set ${i + 1}: ${
                  s.weight ?? "BW"
                } &times; ${s.reps}</div>`
            )
            .join("")}
          <form onsubmit="return handleAddSet(event, ${si})" style="display:flex; gap:8px; margin-top:8px;">
            <input name="weight" type="number" placeholder="lb" style="height:36px;">
            <input name="reps" type="number" placeholder="reps" required style="height:36px;">
            <button class="btn-ghost" style="height:36px; width:auto; padding:0 14px;">Add set</button>
          </form>
        </div>`
        )
        .join("")}
    </div>
    <div class="field" style="margin-top:16px;">
      <label>Add station</label>
      <select onchange="if(this.value){addStation(this.value); this.value=''}">
        <option value="">Choose exercise…</option>
        ${exercises
          .map((e) => `<option value="${e.id}">${e.name}</option>`)
          .join("")}
      </select>
    </div>`;
}

function handleAddSet(evt, stationIdx) {
  evt.preventDefault();
  const form = evt.target;
  addSet(stationIdx, form.weight.value, form.reps.value);
  form.reset();
  return false;
}

document.addEventListener("DOMContentLoaded", async () => {
  renderNav("workout");
  await ensureSeeded();
  render();
  document.getElementById("start-fab").addEventListener("click", () => {
    if (!getActiveWorkout()) startWorkout();
  });
});