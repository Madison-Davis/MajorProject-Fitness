// ============================================================================
// data.js — storage layer
//
// Source-of-truth shape on disk (and in localStorage) matches the JSON
// schema: exercises.json is a flat table, workouts.json is nested per day.
// flatten() + buildIndexes() build an in-memory, query-fast view on top —
// never persisted, always rebuilt from the two tables above.
// ============================================================================

const STORAGE_KEYS = {
  exercises: "fitness_exercises",
  workouts: "fitness_workouts",
};

const SCHEMA_VERSION = 1;

// ---- migrations -----------------------------------------------------------
// Add an entry here whenever SCHEMA_VERSION bumps. Each fn takes the old
// shape and returns the next version up; loadWorkouts/loadExercises walk the
// chain until current.
const MIGRATIONS = {
  // 1: (old) => ({ ...old, schemaVersion: 2, ... }),
};

function migrate(record) {
  let data = record;
  while ((data.schemaVersion || 1) < SCHEMA_VERSION) {
    const fn = MIGRATIONS[data.schemaVersion || 1];
    if (!fn) break;
    data = fn(data);
  }
  return data;
}

// ---- fake data for UX building ---------------------------------------------
// Dev-only reference data: one week, alternating Upper/Lower (matches your
// usual split), 5-7 machines/session, weights nudging up across the week so
// the progression chart has something to show. Flip USE_FAKE_SEED_DATA to
// false (or delete this block + the two consts below) once you're working
// with real logged data instead of UX reference data.
const USE_FAKE_SEED_DATA = true;

const FAKE_EXERCISES = {
  schemaVersion: 1,
  exercises: [
    { id: "lat_pulldown", name: "Lat Pulldown", equipmentType: "dual_machine", primaryMuscles: ["back"], secondaryMuscles: ["biceps"], notes: "" },
    { id: "chest_press", name: "Chest Press", equipmentType: "dual_machine", primaryMuscles: ["chest"], secondaryMuscles: ["triceps", "deltoid"], notes: "" },
    { id: "shoulder_press", name: "Shoulder Press", equipmentType: "dual_machine", primaryMuscles: ["deltoid"], secondaryMuscles: ["triceps"], notes: "" },
    { id: "bicep_curl", name: "Bicep Curl", equipmentType: "cable", primaryMuscles: ["biceps"], secondaryMuscles: [], notes: "" },
    { id: "tricep_pushdown", name: "Tricep Pushdown", equipmentType: "cable", primaryMuscles: ["triceps"], secondaryMuscles: [], notes: "" },
    { id: "seated_row", name: "Seated Row", equipmentType: "plate_loaded_red", primaryMuscles: ["back"], secondaryMuscles: ["biceps"], notes: "" },
    { id: "leg_press", name: "Leg Press", equipmentType: "plate_loaded_grey", primaryMuscles: ["quads"], secondaryMuscles: ["hams"], notes: "" },
    { id: "leg_extension", name: "Leg Extension", equipmentType: "dual_machine", primaryMuscles: ["quads"], secondaryMuscles: [], notes: "" },
    { id: "leg_curl", name: "Leg Curl", equipmentType: "dual_machine", primaryMuscles: ["hams"], secondaryMuscles: ["calves"], notes: "" },
    { id: "calf_raise", name: "Calf Raise", equipmentType: "plate_loaded_red", primaryMuscles: ["calves"], secondaryMuscles: [], notes: "" },
    { id: "ab_crunch", name: "Ab Crunch", equipmentType: "dual_machine", primaryMuscles: ["core"], secondaryMuscles: [], notes: "" },
  ],
};

const FAKE_WORKOUTS = {
  schemaVersion: 1,
  workouts: [
    {
      day: "2026-10-03", startTime: "18:00", endTime: "19:05",
      stations: [
        { exerciseId: "lat_pulldown", sets: [{ weight: 110, reps: 10 }, { weight: 110, reps: 9 }, { weight: 100, reps: 10 }] },
        { exerciseId: "chest_press", sets: [{ weight: 95, reps: 10 }, { weight: 95, reps: 8 }, { weight: 85, reps: 10 }] },
        { exerciseId: "shoulder_press", sets: [{ weight: 65, reps: 10 }, { weight: 65, reps: 9 }] },
        { exerciseId: "bicep_curl", sets: [{ weight: 30, reps: 12 }, { weight: 30, reps: 10 }] },
        { exerciseId: "tricep_pushdown", sets: [{ weight: 40, reps: 12 }, { weight: 40, reps: 11 }] },
      ],
    },
    {
      day: "2026-10-04", startTime: "17:45", endTime: "18:50",
      stations: [
        { exerciseId: "leg_press", sets: [{ weight: 260, reps: 12 }, { weight: 260, reps: 10 }, { weight: 240, reps: 12 }] },
        { exerciseId: "leg_extension", sets: [{ weight: 90, reps: 12 }, { weight: 90, reps: 10 }] },
        { exerciseId: "leg_curl", sets: [{ weight: 80, reps: 12 }, { weight: 80, reps: 10 }] },
        { exerciseId: "calf_raise", sets: [{ weight: 150, reps: 15 }, { weight: 150, reps: 15 }] },
        { exerciseId: "ab_crunch", sets: [{ weight: 60, reps: 15 }, { weight: 60, reps: 15 }] },
      ],
    },
    {
      day: "2026-10-06", startTime: "18:10", endTime: "19:15",
      stations: [
        { exerciseId: "lat_pulldown", sets: [{ weight: 115, reps: 10 }, { weight: 115, reps: 9 }, { weight: 105, reps: 10 }] },
        { exerciseId: "seated_row", sets: [{ weight: 100, reps: 10 }, { weight: 100, reps: 9 }] },
        { exerciseId: "chest_press", sets: [{ weight: 100, reps: 10 }, { weight: 100, reps: 8 }, { weight: 90, reps: 10 }] },
        { exerciseId: "bicep_curl", sets: [{ weight: 32, reps: 11 }, { weight: 32, reps: 10 }] },
        { exerciseId: "tricep_pushdown", sets: [{ weight: 42, reps: 12 }, { weight: 42, reps: 10 }] },
      ],
    },
    {
      day: "2026-10-07", startTime: "18:02", endTime: "19:10",
      stations: [
        { exerciseId: "leg_press", sets: [{ weight: 270, reps: 12 }, { weight: 270, reps: 10 }, { weight: 250, reps: 12 }] },
        { exerciseId: "leg_extension", sets: [{ weight: 95, reps: 12 }, { weight: 95, reps: 10 }] },
        { exerciseId: "leg_curl", sets: [{ weight: 85, reps: 11 }, { weight: 85, reps: 10 }] },
        { exerciseId: "calf_raise", sets: [{ weight: 160, reps: 15 }, { weight: 160, reps: 14 }] },
        { exerciseId: "ab_crunch", sets: [{ weight: 65, reps: 15 }, { weight: 65, reps: 15 }] },
      ],
    },
    {
      day: "2026-10-09", startTime: "17:50", endTime: "19:00",
      stations: [
        { exerciseId: "lat_pulldown", sets: [{ weight: 120, reps: 10 }, { weight: 120, reps: 9 }, { weight: 110, reps: 10 }] },
        { exerciseId: "shoulder_press", sets: [{ weight: 70, reps: 10 }, { weight: 70, reps: 8 }] },
        { exerciseId: "seated_row", sets: [{ weight: 105, reps: 10 }, { weight: 105, reps: 9 }] },
        { exerciseId: "bicep_curl", sets: [{ weight: 32, reps: 12 }, { weight: 32, reps: 10 }] },
        { exerciseId: "tricep_pushdown", sets: [{ weight: 45, reps: 12 }, { weight: 45, reps: 10 }] },
      ],
    },
  ],
};

// ---- first-run seeding ------------------------------------------------------
// localStorage starts empty on a fresh install. If there's nothing there yet,
// either copy in the fake UX-reference data above, or (once you flip
// USE_FAKE_SEED_DATA off) pull the committed data/*.json files instead. After
// that, localStorage is the live source — these are only touched again by
// your export/import (GitHub backup) flow.
async function ensureSeeded() {
  const hasExercises = localStorage.getItem(STORAGE_KEYS.exercises) !== null;
  const hasWorkouts = localStorage.getItem(STORAGE_KEYS.workouts) !== null;
  if (hasExercises && hasWorkouts) return;

  if (USE_FAKE_SEED_DATA) {
    if (!hasExercises) localStorage.setItem(STORAGE_KEYS.exercises, JSON.stringify(FAKE_EXERCISES));
    if (!hasWorkouts) localStorage.setItem(STORAGE_KEYS.workouts, JSON.stringify(FAKE_WORKOUTS));
    return;
  }

  try {
    if (!hasExercises) {
      const res = await fetch("data/exercises.json");
      const json = await res.json();
      localStorage.setItem(STORAGE_KEYS.exercises, JSON.stringify(json));
    }
    if (!hasWorkouts) {
      const res = await fetch("data/workouts.json");
      const json = await res.json();
      localStorage.setItem(STORAGE_KEYS.workouts, JSON.stringify(json));
    }
  } catch (err) {
    // Most common cause: opened via file:// instead of a local server, which
    // blocks fetch() on local files in most browsers. Fall back to empty
    // rather than throwing, so the page still renders its empty state.
    console.warn("Seed load failed (serve over http://, not file://):", err);
    if (!hasExercises) saveExercises([]);
    if (!hasWorkouts) saveWorkouts([]);
  }
}

// ---- raw load/save ---------------------------------------------------------
function loadExercises() {
  const raw = localStorage.getItem(STORAGE_KEYS.exercises);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return (parsed.exercises || []).map(migrate);
}

function saveExercises(exercises) {
  localStorage.setItem(
    STORAGE_KEYS.exercises,
    JSON.stringify({ schemaVersion: SCHEMA_VERSION, exercises })
  );
}

function loadWorkouts() {
  const raw = localStorage.getItem(STORAGE_KEYS.workouts);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return (parsed.workouts || []).map(migrate);
}

function saveWorkouts(workouts) {
  localStorage.setItem(
    STORAGE_KEYS.workouts,
    JSON.stringify({ schemaVersion: SCHEMA_VERSION, workouts })
  );
}

function getWorkoutByDay(day) {
  return loadWorkouts().find((w) => w.day === day) || null;
}

function upsertWorkout(workout) {
  const workouts = loadWorkouts();
  const idx = workouts.findIndex((w) => w.day === workout.day);
  if (idx >= 0) workouts[idx] = workout;
  else workouts.push(workout);
  saveWorkouts(workouts);
}

function upsertExercise(exercise) {
  const exercises = loadExercises();
  const idx = exercises.findIndex((e) => e.id === exercise.id);
  if (idx >= 0) exercises[idx] = exercise;
  else exercises.push(exercise);
  saveExercises(exercises);
}

// ---- flatten + indexes -----------------------------------------------------
function isoWeek(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((target - firstThursday) / 86400000 -
        3 +
        ((firstThursday.getDay() + 6) % 7)) /
        7
    );
  return `${target.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function isoMonth(dateStr) {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

/** Flattens nested workouts into one row per set. In-memory only. */
function flatten(workouts) {
  const log = [];
  for (const w of workouts) {
    for (const station of w.stations) {
      station.sets.forEach((set, i) => {
        log.push({
          day: w.day,
          week: isoWeek(w.day),
          month: isoMonth(w.day),
          exerciseId: station.exerciseId,
          setIndex: i,
          weight: set.weight,
          reps: set.reps,
        });
      });
    }
  }
  return log;
}

/** Builds O(1) lookup maps over a flat set-log + exercise table. */
function buildIndexes(setLog, exercises) {
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const byExercise = new Map();
  const byWeek = new Map();
  const byMonth = new Map();
  const byMuscle = new Map(); // entries carry a `weight` multiplier (1 primary, 0.5 secondary)

  const push = (map, key, val) => {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(val);
  };

  for (const entry of setLog) {
    push(byExercise, entry.exerciseId, entry);
    push(byWeek, entry.week, entry);
    push(byMonth, entry.month, entry);

    const ex = exerciseById.get(entry.exerciseId);
    if (!ex) continue;
    for (const m of ex.primaryMuscles || []) {
      push(byMuscle, m, { ...entry, volumeWeight: 1 });
    }
    for (const m of ex.secondaryMuscles || []) {
      push(byMuscle, m, { ...entry, volumeWeight: 0.5 });
    }
  }

  return { exerciseById, byExercise, byWeek, byMonth, byMuscle };
}

/** Call once per page load (or after import/save) to get a fresh query layer. */
function buildQueryLayer() {
  const exercises = loadExercises();
  const workouts = loadWorkouts();
  const setLog = flatten(workouts);
  const indexes = buildIndexes(setLog, exercises);
  return { exercises, workouts, setLog, ...indexes };
}

// ---- export/import for the GitHub backup repo ------------------------------
// Matches the committed file shapes exactly, so these can be written straight
// into MajorProject-Fitness-Data/exercises.json and workouts/YYYY-MM-DD.json.
function exportExercisesJSON() {
  return JSON.stringify(
    { schemaVersion: SCHEMA_VERSION, exercises: loadExercises() },
    null,
    2
  );
}

function exportWorkoutJSON(day) {
  const w = getWorkoutByDay(day);
  if (!w) return null;
  return JSON.stringify({ schemaVersion: SCHEMA_VERSION, ...w }, null, 2);
}

/** Union + dedupe merge: incoming workouts win on conflict (assumed newer). */
function mergeWorkouts(localWorkouts, incomingWorkouts) {
  const byDay = new Map(localWorkouts.map((w) => [w.day, w]));
  for (const w of incomingWorkouts) byDay.set(w.day, migrate(w));
  return Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));
}

function importWorkoutsJSON(jsonArray) {
  const incoming = jsonArray.map(migrate);
  const merged = mergeWorkouts(loadWorkouts(), incoming);
  saveWorkouts(merged);
}
