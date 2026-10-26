
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function renderActiveWorkout() {
  const root = document.getElementById("active-workout-root");
  const workout = getActiveWorkout();
  const endButton = document.getElementById("end-workout-btn");

  if (!workout) {
    root.innerHTML = "<p>No active workout.</p>";
    endButton.disabled = true;
    return;
  }

  endButton.disabled = false;

  const exercises = loadExercises();
  const exerciseById = new Map(exercises.map(e => [e.id, e]));

  root.innerHTML = `
    <section class="active-meta">
      <div class="meta-row">
        <span>Start Time</span>
        <span class="meta-values">
          <input data-workout-field="day" type="date" value="${escapeHtml(workout.day || "")}">
          <input data-workout-field="startTime" type="time" value="${escapeHtml(workout.startTime || "")}">
        </span>
      </div>
      <div class="meta-row">
        <span>End Time</span>
        <span class="meta-values">
          <input data-workout-field="endTime" type="time" value="${escapeHtml(workout.endTime || "")}">
        </span>
      </div>
      <div class="meta-row">
        <span>Weight</span>
        <span class="meta-values">
          <input data-workout-field="bodyWeight" type="number" step="0.1" placeholder="—" value="${workout.bodyWeight ?? ""}">
          <span>lbs</span>
        </span>
      </div>
      <button type="button" class="meta-row measurements-toggle" id="measurements-toggle">
        <span>Measurements</span><span>›</span>
      </button>
      <div id="measurements-fields" hidden>
        <textarea data-workout-field="measurements" placeholder="Notes or measurements">${escapeHtml(workout.measurements || "")}</textarea>
      </div>
    </section>

    <section class="exercise-list">
      ${(workout.stations || []).map((station, si) => {
        const exercise = exerciseById.get(station.exerciseId);
        return `
          <article class="active-exercise">
            <div class="exercise-heading">
              <button class="exercise-name" data-action="rename" data-station="${si}">
                ${escapeHtml(exercise?.name || station.exerciseId)} ›
              </button>
              <button class="exercise-menu" data-action="remove-exercise" data-station="${si}">•••</button>
            </div>
            <div class="equipment-label">Equipment: ${escapeHtml(exercise?.equipmentType || "Machine")}</div>

            <div class="set-table">
              <div class="set-table-head">
                <span>Set #</span><span>Reps</span><span>Weight</span>
              </div>
              ${(station.sets || []).map((set, sj) => `
                <div class="set-line">
                  <span class="set-number">${sj + 1}</span>
                  <input aria-label="Reps" type="number" min="1" placeholder="—"
                    data-set-field="reps" data-station="${si}" data-set="${sj}" value="${set.reps ?? ""}">
                  <input aria-label="Weight" type="number" min="0" step="0.5" placeholder="—"
                    data-set-field="weight" data-station="${si}" data-set="${sj}" value="${set.weight ?? ""}">
                  <button class="set-check ${set.completed ? "is-complete" : ""}"
                    data-action="toggle-set" data-station="${si}" data-set="${sj}">
                    ${set.completed ? "✓" : "○"}
                  </button>
                </div>
              `).join("")}
            </div>

            <div class="set-actions">
              <button data-action="add-warmup" data-station="${si}">+ Add Warmup</button>
              <button data-action="add-set" data-station="${si}">+ Add Set</button>
            </div>
          </article>
        `;
      }).join("")}
    </section>

    <section class="add-exercise-area">
      <label for="add-station-select">Add exercise</label>
      <select id="add-station-select">
        <option value="">Choose exercise…</option>
        ${exercises.map(e => `<option value="${escapeHtml(e.id)}">${escapeHtml(e.name)}</option>`).join("")}
      </select>
    </section>
  `;

  document.getElementById("measurements-toggle").onclick = () => {
    const fields = document.getElementById("measurements-fields");
    fields.hidden = !fields.hidden;
  };
}

function saveWorkoutField(event) {
  const field = event.target.dataset.workoutField;
  if (!field) return;

  const workout = getActiveWorkout();
  if (!workout) return;

  const value = event.target.value;
  workout[field] = field === "bodyWeight"
    ? (value === "" ? null : Number(value))
    : value;

  setActiveWorkout(workout);
}

function saveSetField(event) {
  const field = event.target.dataset.setField;
  if (!field) return;

  const workout = getActiveWorkout();
  const si = Number(event.target.dataset.station);
  const sj = Number(event.target.dataset.set);
  const set = workout?.stations?.[si]?.sets?.[sj];
  if (!set) return;

  const value = event.target.value;
  set[field] = value === "" ? null : Number(value);
  setActiveWorkout(workout);
}

function addSet(si, warmup = false) {
  const workout = getActiveWorkout();
  if (!workout?.stations?.[si]) return;

  workout.stations[si].sets.push({
    reps: null,
    weight: null,
    rpe: null,
    completed: false,
    warmup
  });

  setActiveWorkout(workout);
  renderActiveWorkout();
}

function handleWorkoutAction(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const si = Number(button.dataset.station);
  const sj = Number(button.dataset.set);
  const workout = getActiveWorkout();
  if (!workout) return;

  if (action === "add-set" || action === "add-warmup") {
    addSet(si, action === "add-warmup");
    return;
  }

  if (action === "toggle-set") {
    const set = workout.stations[si]?.sets[sj];
    if (!set) return;
    set.completed = !set.completed;
    setActiveWorkout(workout);
    renderActiveWorkout();
    return;
  }

  if (action === "remove-exercise") {
    if (!confirm("Remove this exercise and its sets?")) return;
    workout.stations.splice(si, 1);
    setActiveWorkout(workout);
    renderActiveWorkout();
    return;
  }

  if (action === "rename") {
    const options = loadExercises();
    const list = options.map((e, i) => `${i + 1}. ${e.name}`).join("\n");
    const answer = prompt(`Choose exercise:\n${list}\n\nEnter its number:`);
    const selected = options[Number(answer) - 1];
    if (!selected) return;

    workout.stations[si].exerciseId = selected.id;
    setActiveWorkout(workout);
    renderActiveWorkout();
  }
}

function finishActiveWorkout() {
  const workout = getActiveWorkout();
  if (workout) {
    workout.endTime = workout.endTime || nowTime();
    upsertWorkout(workout);
    clearActiveWorkout();
  }
  window.location.href = "logs.html";
}

document.addEventListener("DOMContentLoaded", async () => {
  renderTopbar("Active Workout", { noLeftSlot: true });
  renderNav("workouts");

  await ensureSeeded();
  if (!getActiveWorkout()) startBlankWorkout();
  renderActiveWorkout();

  const root = document.getElementById("active-workout-root");

  root.addEventListener("input", event => {
    saveWorkoutField(event);
    saveSetField(event);
  });

  root.addEventListener("change", event => {
    saveWorkoutField(event);
    saveSetField(event);
    if (event.target.id === "add-station-select") {
      const id = event.target.value;
      const workout = getActiveWorkout();
      if (!id || !workout) return;
      workout.stations.push({ exerciseId: id, sets: [] });
      setActiveWorkout(workout);
      renderActiveWorkout();
    }
  });

  root.addEventListener("click", handleWorkoutAction);
  document.getElementById("end-workout-btn").addEventListener("click", finishActiveWorkout);
});