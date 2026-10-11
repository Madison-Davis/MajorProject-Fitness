// ============================================================================
// workout.js — logic for index.html: the active-workout screen + templates
// ============================================================================

const ACTIVE_KEY = "fitness_active_workout"; // draft, separate from saved workouts

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  return new Date().toTimeString().slice(0, 5); // "HH:MM"
}

// ---- active workout ---------------------------------------------------------
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
  setActiveWorkout({ day: todayStr(), startTime: nowTime(), endTime: null, stations: [] });
  render();
}

/** Starts a live workout pre-loaded with a template's exercises (empty sets
 *  to fill in as you go) — the whole point of having templates. */
function startWorkoutFromTemplate(id) {
  if (getActiveWorkout()) return; // one active workout at a time
  const template = loadTemplates().find((t) => t.id === id);
  if (!template) return;
  setActiveWorkout({
    day: todayStr(),
    startTime: nowTime(),
    endTime: null,
    stations: template.stations.map((s) => ({ exerciseId: s.exerciseId, sets: [] })),
  });
  render();
}

function endWorkout() {
  const w = getActiveWorkout();
  if (!w) return;
  w.endTime = nowTime();
  upsertWorkout(w);
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
        <p>No active workout. Press + to start one, or tap a template below.</p>
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

// ---- templates ----------------------------------------------------------
let editingTemplateId = null;
let templateDraftStations = []; // [{ exerciseId, targetSets, targetReps }]

function renderTemplatesList() {
  const root = document.getElementById("templates-root");
  const templates = loadTemplates();
  const exById = new Map(loadExercises().map((e) => [e.id, e]));

  if (!templates.length) {
    root.innerHTML = `<div class="empty"><span class="num-lg">—</span><p>No templates yet. Tap + to create one.</p></div>`;
    return;
  }

  root.innerHTML = `<div class="row-list">${templates
    .map(
      (t) => `
    <div class="row">
      <button style="text-align:left; flex:1; overflow:hidden;" onclick="startWorkoutFromTemplate('${t.id}')">
        <div class="row-title">${t.name}</div>
        <div class="row-sub">${t.stations
          .map((s) => exById.get(s.exerciseId)?.name || s.exerciseId)
          .join(", ")}</div>
      </button>
      <button class="icon-btn" onclick="openTemplateSheet('${t.id}')" aria-label="Edit ${t.name}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z"/>
        </svg>
      </button>
    </div>`
    )
    .join("")}</div>`;
}

function populateTemplateExerciseSelect() {
  const sel = document.getElementById("template-add-exercise-select");
  sel.innerHTML =
    `<option value="">Choose exercise…</option>` +
    loadExercises().map((e) => `<option value="${e.id}">${e.name}</option>`).join("");
}

function renderTemplateStations() {
  const root = document.getElementById("template-stations-root");
  const exById = new Map(loadExercises().map((e) => [e.id, e]));

  root.innerHTML = templateDraftStations
    .map(
      (s, i) => `
    <div class="template-station">
      <div style="flex:1;">
        <div class="row-title">${exById.get(s.exerciseId)?.name || s.exerciseId}</div>
        <div class="template-station-inputs">
          <input class="sets-input" type="number" min="1" value="${s.targetSets ?? ""}"
                 placeholder="sets" oninput="updateTemplateStationField(${i}, 'targetSets', this.value)">
          <input class="reps-input" type="text" value="${s.targetReps ?? ""}"
                 placeholder="reps, e.g. 8-12" oninput="updateTemplateStationField(${i}, 'targetReps', this.value)">
        </div>
      </div>
      <button class="icon-btn" onclick="removeTemplateStation(${i})" aria-label="Remove exercise">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>`
    )
    .join("");
}

function updateTemplateStationField(i, field, value) {
  templateDraftStations[i][field] = field === "targetSets" ? Number(value) : value;
}

function removeTemplateStation(i) {
  templateDraftStations.splice(i, 1);
  renderTemplateStations();
}

function openTemplateSheet(id) {
  editingTemplateId = id || null;
  const existing = id ? loadTemplates().find((t) => t.id === id) : null;
  templateDraftStations = existing ? existing.stations.map((s) => ({ ...s })) : [];

  document.getElementById("template-sheet-title").textContent = existing ? "Edit Template" : "New Template";
  document.getElementById("template-name-input").value = existing ? existing.name : "";
  document.getElementById("template-delete-btn").style.display = existing ? "block" : "none";

  populateTemplateExerciseSelect();
  renderTemplateStations();

  document.getElementById("template-overlay").classList.add("open");
  document.getElementById("template-sheet").classList.add("open");
}

function closeTemplateSheet() {
  document.getElementById("template-overlay").classList.remove("open");
  document.getElementById("template-sheet").classList.remove("open");
}

function saveTemplate() {
  const name = document.getElementById("template-name-input").value.trim();
  if (!name || !templateDraftStations.length) return; // need at least a name + one exercise
  const id =
    editingTemplateId || (crypto.randomUUID ? crypto.randomUUID() : `tmpl_${Date.now()}`);
  upsertTemplate({ id, name, stations: templateDraftStations });
  closeTemplateSheet();
  renderTemplatesList();
}

function deleteTemplateFromSheet() {
  if (editingTemplateId) deleteTemplate(editingTemplateId);
  closeTemplateSheet();
  renderTemplatesList();
}

// ---- wiring ---------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  renderTopbar("Workout");
  renderNav("workout");
  await ensureSeeded();

  render();
  renderTemplatesList();

  document.getElementById("start-fab").addEventListener("click", () => {
    if (!getActiveWorkout()) startWorkout();
  });

  document.getElementById("new-template-btn").addEventListener("click", () => openTemplateSheet(null));
  document.getElementById("template-cancel-btn").addEventListener("click", closeTemplateSheet);
  document.getElementById("template-overlay").addEventListener("click", closeTemplateSheet);
  document.getElementById("template-save-btn").addEventListener("click", saveTemplate);
  document.getElementById("template-delete-btn").addEventListener("click", deleteTemplateFromSheet);

  document.getElementById("template-add-exercise-select").addEventListener("change", function () {
    if (this.value) {
      templateDraftStations.push({ exerciseId: this.value, targetSets: 3, targetReps: "8-12" });
      this.value = "";
      renderTemplateStations();
    }
  });
});