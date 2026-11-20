import type { AnimName } from "./poses";

export interface Exercise {
  id: string;
  name: string;
  muscles: string;
  anim: AnimName;
  cues: string[];
  /** seconds a single rep takes, used by the workout player for rep-based sets */
  tempo: number;
}

const E = (id: string, name: string, muscles: string, anim: AnimName, cues: string[], tempo = 3): Exercise => ({
  id,
  name,
  muscles,
  anim,
  cues,
  tempo,
});

export const EXERCISES: Record<string, Exercise> = Object.fromEntries(
  [
    // chest
    E("bench", "Barbell Bench Press", "Chest, triceps, front delts", "benchpress", ["Shoulder blades pinched", "Bar to mid-chest", "Feet planted, drive up"]),
    E("db_bench", "Incline Dumbbell Press", "Upper chest, shoulders", "benchpress", ["30–45° bench", "Elbows ~45° from torso", "Press up and slightly in"]),
    E("pushup", "Push-Up", "Chest, triceps, core", "pushup", ["Body in one straight line", "Chest to fist height", "Elbows back at 45°"], 2),
    E("dip", "Parallel Bar Dip", "Chest, triceps", "dip", ["Lean slightly forward", "Shoulders below elbows at bottom", "Lock out at top"]),
    E("fly", "Dumbbell Chest Fly", "Chest", "fly", ["Soft elbows", "Stretch wide", "Hug a tree"]),
    // back
    E("pullup", "Pull-Up", "Lats, biceps, upper back", "pullup", ["Dead hang start", "Chin over bar", "Control the descent"]),
    E("pulldown", "Lat Pulldown", "Lats, biceps", "pullup", ["Chest up", "Pull bar to collarbone", "Squeeze lats"]),
    E("row", "Bent-Over Barbell Row", "Mid back, lats", "row", ["Hinge to ~45°", "Pull to belly button", "Neutral spine"]),
    E("cable_row", "Seated Cable Row", "Mid back, rear delts", "row", ["Sit tall", "Elbows close", "Pause at the squeeze"]),
    E("deadlift", "Deadlift", "Posterior chain, back", "deadlift", ["Bar over mid-foot", "Brace hard", "Push the floor away"], 4),
    // legs
    E("squat", "Barbell Back Squat", "Quads, glutes, core", "squat", ["Brace core", "Knees track toes", "Hip crease below knee"], 3.5),
    E("goblet", "Goblet Squat", "Quads, glutes", "squat", ["Elbows inside knees", "Chest proud", "Sit between heels"]),
    E("leg_press", "Leg Press", "Quads, glutes", "squat", ["Lower back flat", "Knees to chest", "Don't lock knees"]),
    E("lunge", "Walking Lunge", "Quads, glutes, balance", "lunge", ["Long stride", "Back knee kisses floor", "Torso upright"]),
    E("rdl", "Romanian Deadlift", "Hamstrings, glutes", "deadlift", ["Soft knees", "Push hips back", "Feel hamstring stretch"]),
    E("calf", "Standing Calf Raise", "Calves", "calf", ["Full stretch at bottom", "Pause on toes"], 2),
    // shoulders / arms
    E("ohp", "Overhead Press", "Shoulders, triceps", "press", ["Squeeze glutes", "Bar path straight up", "Head through at top"]),
    E("lateral", "Lateral Raise", "Side delts", "lateral", ["Lead with elbows", "Stop at shoulder height", "Slow down"], 2.5),
    E("face_pull", "Face Pull", "Rear delts, rotator cuff", "row", ["Pull to eye level", "Elbows high", "Rotate out"]),
    E("curl", "Dumbbell Biceps Curl", "Biceps", "curl", ["Elbows pinned", "No swinging", "Squeeze at top"], 2.5),
    E("hammer", "Hammer Curl", "Biceps, forearms", "curl", ["Neutral grip", "Control down"], 2.5),
    E("triceps", "Overhead Triceps Extension", "Triceps", "triceps", ["Elbows point up", "Full stretch behind head"], 2.5),
    // core
    E("plank", "Plank", "Core", "plank", ["Squeeze glutes", "Ribs down", "Breathe steadily"]),
    E("leg_raise", "Lying Leg Raise", "Lower abs", "legraise", ["Lower back pressed down", "Slow lowering"]),
    E("crunch", "Crunch", "Abs", "crunch", ["Chin off chest", "Exhale up"], 2),
    E("situp", "Military Sit-Up", "Abs, hip flexors", "situp", ["Hands crossed on chest", "Shoulders to knees", "Control down"], 2),
    E("flutter", "Flutter Kicks", "Lower abs, hip flexors", "flutter", ["Legs straight", "Heels 15 cm off floor", "Small fast kicks"], 1),
    E("mountain", "Mountain Climbers", "Core, cardio", "mountain", ["Hips level", "Drive knees fast"], 1),
    // conditioning
    E("burpee", "Burpee", "Full body, cardio", "burpee", ["Chest to floor", "Explode up", "Clap overhead"], 3),
    E("jack", "Jumping Jacks", "Cardio, shoulders", "jumpingjack", ["Light on toes", "Full arm swing"], 1),
    E("run", "Run", "Cardio endurance", "run", ["Tall posture", "Relaxed shoulders", "Steady breathing"], 1),
    E("highknees", "High Knees", "Cardio, hip flexors", "run", ["Knees to hip height", "Pump arms"], 0.6),
    E("star", "Star Jumps", "Power, cardio", "jumpingjack", ["Explode wide", "Land soft"], 1.2),
    E("squat_bw", "Air Squat", "Legs", "squat", ["Arms forward", "Full depth"], 2),
    E("jump_squat", "Jump Squat", "Legs, power", "jumpsquat", ["Squat deep", "Explode up", "Soft landing"], 2),
    E("diamond", "Diamond Push-Up", "Triceps, chest", "pushup", ["Hands form a diamond", "Elbows tight"], 2),
    E("wide_pushup", "Wide Push-Up", "Chest", "pushup", ["Hands wider than shoulders"], 2),
    E("chinup", "Chin-Up", "Biceps, lats", "pullup", ["Palms facing you", "Chin over bar"]),
    E("stretch", "Mobility & Stretch", "Full body recovery", "stretch", ["Breathe deep", "Hold each stretch 30s"], 4),
  ].map((e) => [e.id, e]),
);

export function getExercise(id: string): Exercise {
  return EXERCISES[id] ?? EXERCISES.stretch;
}
