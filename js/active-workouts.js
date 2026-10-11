// Active workout page: log sets, add exercises, and save the finished workout.

function renderActiveWorkout() {
  const root = document.getElementById("active-workout-root");
  const workout = getActiveWorkout();
  if (!workout) {
    root.innerHTML = '<div class="empty"><span class="num-lg">—</span><p>No active workout.</p></div>';
    document.getElementById("end-workout-btn").disabled = true;
    return;
  }

  const exercises = loadExercises();
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  root.innerHTML = `
    <div class="row" style="border-bottom:1px solid var(--line);">
      <div>
        <div class="row-title">${workout.day}</div>
        <div class="row-sub">Started ${workout.startTime}</div>
      </div>
    </div>
    <div class="row-list">
      ${workout.stations.map((station, stationIndex) => `
        <div class="row" style="flex-direction:column; align-items:stretch;">
          <div class="row-title">${exerciseById.get(station.exerciseId)?.name || station.exerciseId}</div>
          ${station.sets.map((set, setIndex) => `
            <div class="row-sub">Set ${setIndex + 1}: ${set.weight ?? "BW"} × ${set.reps}</div>
          `).join("")}
          <form class="add-set-form" data-station="${stationIndex}" style="display:flex; gap:8px; margin-top:8px;">
            <input name="weight" type="number" min="0" placeholder="lb" aria-label="Weight in pounds" style="height:36px;">
            <input name="reps" type="number" min="1" placeholder="reps" aria-label="Repetitions" required style="height:36px;">
            <button class="btn-ghost" style="height:36px; width:auto; padding:0 14px;">Add set</button>
          </form>
        </div>
      `).join("")}
    </div>
    <div class="field" style="margin-top:16px;">
      <label for="add-station-select">Add exercise</label>
      <select id="add-station-select">
        <option value="">Choose exercise…</option>
        ${exercises.map((exercise) => `<option value="${exercise.id}">${exercise.name}</option>`).join("")}
      </select>
    </div>`;
}

function addActiveSet(event) {
  event.preventDefault();
  const form = event.target;
  const workout = getActiveWorkout();
  const stationIndex = Number(form.dataset.station);
  if (!workout || !workout.stations[stationIndex]) return;

  workout.stations[stationIndex].sets.push({
    weight: form.elements.weight.value === "" ? null : Number(form.elements.weight.value),
    reps: Number(form.elements.reps.value),
  });
  setActiveWorkout(workout);
  renderActiveWorkout();
}

function addActiveStation(exerciseId) {
  const workout = getActiveWorkout();
  if (!workout || !exerciseId) return;
  workout.stations.push({ exerciseId, sets: [] });
  setActiveWorkout(workout);
  renderActiveWorkout();
}

function finishActiveWorkout() {
  const workout = getActiveWorkout();
  if (workout) {
    workout.endTime = nowTime();
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

  document.getElementById("active-workout-root").addEventListener("submit", addActiveSet);
  document.getElementById("active-workout-root").addEventListener("change", (event) => {
    if (event.target.id === "add-station-select") {
      addActiveStation(event.target.value);
    }
  });
  document.getElementById("end-workout-btn").addEventListener("click", finishActiveWorkout);
});
