// ============================================================================
// workouts.js — logic for index.html, the combined Workouts page.
// Toggles between an Exercises list and a Templates list, both searchable;
// Exercises also gets the filter sheet (by equipment type or by muscle).
// The "+" FAB adds an exercise in Exercises mode or starts a workout in
// Templates mode. Templates can also be created with the separate button.
// ============================================================================

const EQUIPMENT_TYPES = [
  { value: "dual_machine", label: "Dual machine" },
  { value: "plate_loaded_red", label: "Plate-loaded (red)" },
  { value: "plate_loaded_grey", label: "Plate-loaded (grey)" },
  { value: "cable", label: "Cable" },
  { value: "barbell", label: "Barbell" },
  { value: "dumbbell", label: "Dumbbell" },
  { value: "bodyweight", label: "Bodyweight" },
];

const MUSCLES = ["biceps", "triceps", "deltoid", "back", "quads", "hams", "calves", "core", "chest"];

let selectedPrimary = [];
let selectedSecondary = [];

function renderMuscleRows(containerId, selected = []) {
  document.getElementById(containerId).innerHTML = MUSCLES.map(m => `
    <div class="row" data-muscle="${m}">
      <div class="row-title">${m[0].toUpperCase() + m.slice(1)}</div>
      <div class="settings-toggle ${selected.includes(m) ? 'active' : ''}"></div>
    </div>`).join("");
}

function wireMuscleToggle(containerId, selectedArr) {
  document.getElementById(containerId).addEventListener("click", (e) => {
    const row = e.target.closest(".row");
    if (!row) return;
    const muscle = row.dataset.muscle;
    const dot = row.querySelector(".settings-toggle");
    const idx = selectedArr.indexOf(muscle);
    if (idx === -1) {
      selectedArr.push(muscle);
      dot.classList.add("active");
    } else {
      selectedArr.splice(idx, 1);
      dot.classList.remove("active");
    }
  });
}

const state = {
  mode: "exercises", // "exercises" | "templates"
  search: "",
  filter: { kind: null, value: null }, // kind: "equipment" | "muscle"
};

function slugify(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function equipmentLabel(value) {
  return EQUIPMENT_TYPES.find((t) => t.value === value)?.label || value;
}

// ---- top-level render dispatch --------------------------------------------
function renderList() {
  document.getElementById("filter-btn").style.display = state.mode === "exercises" ? "" : "none";
  document.getElementById("new-template-btn").style.display = state.mode === "templates" ? "" : "none";
  if (state.mode === "exercises") renderExercisesList();
  else renderTemplatesList();
  updateFilterButtonLabel();
}

function updateFilterButtonLabel() {
  const btn = document.getElementById("filter-btn");
  if (state.filter.kind === "equipment") btn.textContent = `Filter: ${equipmentLabel(state.filter.value)}`;
  else if (state.filter.kind === "muscle") btn.textContent = `Filter: ${state.filter.value}`;
  else btn.textContent = "Filter";
}

function emptyStateHtml(message) {
  return `<div class="empty"><span class="num-lg">—</span><p>${message}</p></div>`;
}

// ---- Exercises --------------------------------------------------------
const CHEVRON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>`;
const TRASH_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"/></svg>`;

function exerciseRowHtml(e) {
  return `
    <div class="row">
      <div style="flex:1;">
        <div class="row-title">${e.name}</div>
        <div class="row-sub">${equipmentLabel(e.equipmentType)} · ${[...(e.primaryMuscles || []), ...(e.secondaryMuscles || [])].join(", ")}</div>
      </div>
      <button class="icon-btn" onclick="deleteExerciseFromList('${e.id}', '${e.name.replace(/'/g, "\\'")}')" aria-label="Delete ${e.name}" style="color:var(--text-faint);">${TRASH_SVG}</button>
      <button class="icon-btn" onclick="openExerciseSheet('${e.id}')" aria-label="Edit ${e.name}">${CHEVRON_SVG}</button>
    </div>`;
}

function renderExercisesList() {
  const root = document.getElementById("list-root");
  let exercises = loadExercises();

  if (state.search) {
    const q = state.search.toLowerCase();
    exercises = exercises.filter((e) => e.name.toLowerCase().includes(q));
  }

  if (state.filter.kind === "equipment" && state.filter.value) {
    exercises = exercises.filter((e) => e.equipmentType === state.filter.value);
  }

  if (state.filter.kind === "muscle" && state.filter.value) {
    const m = state.filter.value;
    const primary = exercises.filter((e) => (e.primaryMuscles || []).includes(m));
    const secondary = exercises.filter(
      (e) => !(e.primaryMuscles || []).includes(m) && (e.secondaryMuscles || []).includes(m)
    );
    if (!primary.length && !secondary.length) {
      root.innerHTML = emptyStateHtml("No exercises match this filter.");
      return;
    }
    root.innerHTML = `
      ${primary.length ? `<h2 style="margin:16px 0 4px;">Primary</h2><div class="row-list">${primary.map(exerciseRowHtml).join("")}</div>` : ""}
      ${secondary.length ? `<h2 style="margin:16px 0 4px;">Secondary</h2><div class="row-list">${secondary.map(exerciseRowHtml).join("")}</div>` : ""}`;
    return;
  }

  if (!exercises.length) {
    root.innerHTML = emptyStateHtml("No exercises found.");
    return;
  }
  root.innerHTML = `<div class="row-list">${exercises.map(exerciseRowHtml).join("")}</div>`;
}

function populateExerciseFilterSheet() {
  const eqRoot = document.getElementById("filter-equipment-chips");
  eqRoot.innerHTML = EQUIPMENT_TYPES.map(
    (t) =>
      `<button class="chip ${state.filter.kind === "equipment" && state.filter.value === t.value ? "active" : ""}"
               data-kind="equipment" data-value="${t.value}">${t.label}</button>`
  ).join("");

  const muRoot = document.getElementById("filter-muscle-chips");
  muRoot.innerHTML = MUSCLES.map(
    (m) =>
      `<button class="chip ${state.filter.kind === "muscle" && state.filter.value === m ? "active" : ""}"
               data-kind="muscle" data-value="${m}">${m}</button>`
  ).join("");

  document.querySelectorAll("#filter-sheet .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      state.filter = { kind: chip.dataset.kind, value: chip.dataset.value };
      populateExerciseFilterSheet();
      renderList();
    });
  });
}

function openFilterSheet() {
  populateExerciseFilterSheet();
  document.getElementById("filter-overlay").classList.add("open");
  document.getElementById("filter-sheet").classList.add("open");
}

function closeFilterSheet() {
  document.getElementById("filter-overlay").classList.remove("open");
  document.getElementById("filter-sheet").classList.remove("open");
}

function clearFilter() {
  state.filter = { kind: null, value: null };
  populateExerciseFilterSheet();
  renderList();
}

// ---- New / edit exercise sheet ---------------------------------------------
let editingExerciseId = null;

/** No id (or omitted) → "New Exercise". Pass an existing exercise's id to
 *  pre-fill the form and save back over that same id instead of a new one —
 *  called from the chevron on each exercise row. */
function openExerciseSheet(id) {
  editingExerciseId = id || null;
  const existing = id ? loadExercises().find((e) => e.id === id) : null;
  const form = document.getElementById("exercise-form");
  form.reset();

  document.getElementById("exercise-sheet-title").textContent = existing ? "Edit Exercise" : "New Exercise";

  selectedPrimary = existing ? [...(existing.primaryMuscles || [])] : [];
  selectedSecondary = existing ? [...(existing.secondaryMuscles || [])] : [];
  renderMuscleRows("primary-muscle-rows", selectedPrimary);
  renderMuscleRows("secondary-muscle-rows", selectedSecondary);

  if (existing) {
    form.name.value = existing.name;
    form.equipmentType.value = existing.equipmentType;
    form.notes.value = existing.notes || "";
  }

  document.getElementById("exercise-overlay").classList.add("open");
  document.getElementById("exercise-sheet").classList.add("open");
}

function closeExerciseSheet() {
  document.getElementById("exercise-overlay").classList.remove("open");
  document.getElementById("exercise-sheet").classList.remove("open");
}

function handleSaveExercise(evt) {
  evt.preventDefault();
  const form = evt.target;
  const name = form.name.value.trim();
  if (!name) return false;

  upsertExercise({
    id: editingExerciseId || slugify(name), // editing keeps its original id even if the name changes
    name,
    equipmentType: form.equipmentType.value,
    primaryMuscles: [...selectedPrimary],
    secondaryMuscles: [...selectedSecondary],
    notes: form.notes.value.trim(),
  });

  closeExerciseSheet();
  renderList();
  return false;
}

function deleteExerciseFromList(id, name) {
  if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
  deleteExercise(id);
  renderList();
}

// ---- Templates ------------------------------------------------------------
function renderTemplatesList() {
  const root = document.getElementById("list-root");
  let templates = loadTemplates();
  const exById = new Map(loadExercises().map((e) => [e.id, e]));

  if (state.search) {
    const q = state.search.toLowerCase();
    templates = templates.filter((t) => t.name.toLowerCase().includes(q));
  }

  if (!templates.length) {
    root.innerHTML = emptyStateHtml("No templates yet. Tap + to create one.");
    return;
  }

  root.innerHTML = `<div class="row-list">${templates
    .map(
      (t) => `
    <div class="row">
      <button style="text-align:left; flex:1; overflow:hidden;" onclick="launchWorkout('${t.id}')">
        <div class="row-title">${t.name}</div>
        <div class="row-sub">${t.stations.map((s) => exById.get(s.exerciseId)?.name || s.exerciseId).join(", ")}</div>
      </button>
      <button class="icon-btn" onclick="deleteTemplateFromList('${t.id}', '${t.name.replace(/'/g, "\\'")}')" aria-label="Delete ${t.name}" style="color:var(--text-faint);">${TRASH_SVG}</button>
      <button class="icon-btn" onclick="openTemplateSheet('${t.id}')" aria-label="Edit ${t.name}">${CHEVRON_SVG}</button>
    </div>`
    )
    .join("")}</div>`;
}

let editingTemplateId = null;
let templateDraftStations = [];

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
  if (!name || !templateDraftStations.length) return;
  const id = editingTemplateId || (crypto.randomUUID ? crypto.randomUUID() : `tmpl_${Date.now()}`);
  upsertTemplate({ id, name, stations: templateDraftStations });
  closeTemplateSheet();
  renderList();
}

function deleteTemplateFromSheet() {
  if (editingTemplateId) deleteTemplate(editingTemplateId);
  closeTemplateSheet();
  renderList();
}

function deleteTemplateFromList(id, name) {
  if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
  deleteTemplate(id);
  renderList();
}

// ---- mode toggle + FAB ------------------------------------------------
function setMode(mode) {
  state.mode = mode;
  document.getElementById("main-fab").setAttribute(
    "aria-label",
    mode === "exercises" ? "New exercise" : "New workout"
  );
  renderList();
}

document.addEventListener("DOMContentLoaded", async () => {
  renderTopbar("Workouts");
  renderNav("workouts");
  await ensureSeeded();

  renderList();

  document.getElementById("exercise-form").addEventListener("submit", handleSaveExercise);
  wireMuscleToggle("primary-muscle-rows", selectedPrimary);
  wireMuscleToggle("secondary-muscle-rows", selectedSecondary);

  document.getElementById("mode-toggle").querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("mode-toggle").querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      setMode(btn.dataset.value);
    });
  });

  document.getElementById("search-input").addEventListener("input", (e) => {
    state.search = e.target.value;
    renderList();
  });

  document.getElementById("filter-btn").addEventListener("click", openFilterSheet);
  document.getElementById("filter-close-btn").addEventListener("click", closeFilterSheet);
  document.getElementById("filter-overlay").addEventListener("click", closeFilterSheet);
  document.getElementById("clear-filter-btn").addEventListener("click", clearFilter);

  document.getElementById("main-fab").addEventListener("click", () => {
    if (state.mode === "exercises") openExerciseSheet();
    else openNewWorkoutChoice();
  });

  document.getElementById("new-template-btn").addEventListener("click", () => openTemplateSheet(null));
  document.getElementById("new-workout-cancel-btn").addEventListener("click", closeNewWorkoutChoice);
  document.getElementById("new-workout-overlay").addEventListener("click", closeNewWorkoutChoice);
  document.getElementById("start-from-template-btn").addEventListener("click", openTemplatePicker);
  document.getElementById("start-blank-workout-btn").addEventListener("click", startBlankWorkoutFromChoice);
  document.getElementById("template-picker-back-btn").addEventListener("click", () => {
    closeTemplatePicker();
    openNewWorkoutChoice();
  });
  document.getElementById("template-picker-overlay").addEventListener("click", closeTemplatePicker);

  document.getElementById("exercise-cancel-btn").addEventListener("click", closeExerciseSheet);
  document.getElementById("exercise-overlay").addEventListener("click", closeExerciseSheet);
  document.getElementById("exercise-form").addEventListener("submit", handleSaveExercise);

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