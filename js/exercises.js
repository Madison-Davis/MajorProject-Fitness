// ============================================================================
// exercises.js — logic for exercises.html (the reference table)
// ============================================================================

const EQUIPMENT_TYPES = [
  "dual_machine",
  "plate_loaded_red",
  "plate_loaded_grey",
  "cable",
  "barbell",
  "dumbbell",
  "bodyweight",
];

const MUSCLES = [
  "biceps",
  "triceps",
  "deltoid",
  "back",
  "quads",
  "hams",
  "calves",
  "core",
  "chest",
];

function slugify(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function renderList() {
  const root = document.getElementById("exercises-root");
  const exercises = loadExercises();

  if (!exercises.length) {
    root.innerHTML = `<div class="empty"><span class="num-lg">—</span><p>No exercises yet. Press + to add one.</p></div>`;
    return;
  }

  root.innerHTML = `<div class="row-list">${exercises
    .map(
      (e) => `
    <div class="row">
      <div>
        <div class="row-title">${e.name}</div>
        <div class="row-sub">${e.equipmentType} · ${[...(e.primaryMuscles||[]), ...(e.secondaryMuscles||[])].join(", ")}</div>
      </div>
    </div>`
    )
    .join("")}</div>`;
}

function handleAddExercise(evt) {
  evt.preventDefault();
  const form = evt.target;
  const name = form.name.value.trim();
  if (!name) return false;

  upsertExercise({
    id: slugify(name),
    name,
    equipmentType: form.equipmentType.value,
    primaryMuscles: [...form.primaryMuscles.selectedOptions].map((o) => o.value),
    secondaryMuscles: [...form.secondaryMuscles.selectedOptions].map((o) => o.value),
    notes: form.notes.value.trim(),
  });

  closeForm();
  renderList();
  return false;
}

function openForm() {
  document.getElementById("exercise-form-wrap").style.display = "block";
}

function closeForm() {
  document.getElementById("exercise-form-wrap").style.display = "none";
  document.getElementById("exercise-form").reset();
}

document.addEventListener("DOMContentLoaded", async () => {
  renderNav("exercises");
  await ensureSeeded();
  renderList();
  document.getElementById("add-fab").addEventListener("click", openForm);
});