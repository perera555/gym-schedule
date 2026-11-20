import { addDays, addMonths, diffDays, weekdayMon } from "./date";
import type { GymPlan, PlanDay, PlannedExercise, PlanWeek, Profile } from "./types";

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PHASES = [
  {
    name: "Foundation",
    summary: "Build movement quality, tendon strength and work capacity with moderate loads and higher reps.",
    sets: 3,
    reps: { general: "12-15", fat_loss: "15-20", muscle_gain: "10-12", strength: "8-10" },
    rest: 60,
  },
  {
    name: "Hypertrophy",
    summary: "Grow muscle with more volume, controlled tempo and progressive overload each week.",
    sets: 4,
    reps: { general: "8-12", fat_loss: "10-15", muscle_gain: "8-12", strength: "6-8" },
    rest: 90,
  },
  {
    name: "Strength & Power",
    summary: "Heavy compound lifts and lower reps to turn your new muscle into real strength.",
    sets: 5,
    reps: { general: "5-8", fat_loss: "6-10", muscle_gain: "6-8", strength: "3-5" },
    rest: 150,
  },
] as const;

const POOLS: Record<string, string[]> = {
  squat: ["squat", "goblet", "leg_press"],
  hinge: ["deadlift", "rdl"],
  uni: ["lunge", "goblet"],
  legacc: ["leg_press", "lunge", "goblet"],
  chest: ["bench", "db_bench", "dip"],
  chest2: ["fly", "pushup", "db_bench", "wide_pushup"],
  backV: ["pullup", "pulldown", "chinup"],
  backH: ["row", "cable_row"],
  shoulders: ["ohp"],
  lateral: ["lateral", "face_pull"],
  biceps: ["curl", "hammer"],
  triceps: ["triceps", "dip", "diamond"],
  core: ["plank", "leg_raise", "crunch", "mountain"],
  calves: ["calf"],
};

const TEMPLATES: Record<string, { title: string; focus: string; slots: string[] }> = {
  fullA: { title: "Full Body A", focus: "Squat · Push · Pull", slots: ["squat", "chest", "backH", "shoulders", "core", "biceps"] },
  fullB: { title: "Full Body B", focus: "Hinge · Pull · Push", slots: ["hinge", "backV", "chest2", "uni", "core", "triceps"] },
  fullC: { title: "Full Body C", focus: "Legs · Shoulders · Back", slots: ["squat", "shoulders", "backV", "chest", "calves", "core"] },
  upper: { title: "Upper Body", focus: "Chest · Back · Shoulders · Arms", slots: ["chest", "backH", "shoulders", "backV", "biceps", "triceps"] },
  lower: { title: "Lower Body", focus: "Quads · Hamstrings · Glutes · Core", slots: ["squat", "hinge", "uni", "legacc", "calves", "core"] },
  push: { title: "Push Day", focus: "Chest · Shoulders · Triceps", slots: ["chest", "shoulders", "chest2", "lateral", "triceps", "core"] },
  pull: { title: "Pull Day", focus: "Back · Rear delts · Biceps", slots: ["backV", "backH", "hinge", "lateral", "biceps", "core"] },
  legs: { title: "Leg Day", focus: "Quads · Hamstrings · Glutes · Calves", slots: ["squat", "hinge", "uni", "legacc", "calves", "core"] },
};

const SPLITS: Record<number, { weekdays: number[]; templates: string[] }> = {
  3: { weekdays: [0, 2, 4], templates: ["fullA", "fullB", "fullC"] },
  4: { weekdays: [0, 1, 3, 4], templates: ["upper", "lower", "upper", "lower"] },
  5: { weekdays: [0, 1, 2, 4, 5], templates: ["push", "pull", "legs", "upper", "lower"] },
  6: { weekdays: [0, 1, 2, 3, 4, 5], templates: ["push", "pull", "legs", "push", "pull", "legs"] },
};

export function phaseFor(cycle: number) {
  const idx = (cycle - 1) % 3;
  const round = Math.floor((cycle - 1) / 3) + 1;
  return { idx, round, phase: PHASES[idx] };
}

export function generatePlan(opts: {
  profile: Profile;
  cycle: number;
  startDate: string;
  seed: number;
  createdBy: GymPlan["createdBy"];
}): GymPlan {
  const { profile, cycle, startDate, seed } = opts;
  const { idx, round, phase } = phaseFor(cycle);
  const endDate = addMonths(startDate, 3);
  const totalDays = diffDays(startDate, endDate);
  const numWeeks = Math.ceil(totalDays / 7);

  const levelSets = profile.level === "beginner" ? -1 : profile.level === "advanced" ? 1 : 0;
  const exPerDay = profile.level === "beginner" ? 4 : profile.level === "intermediate" ? 5 : 6;
  const baseSets = Math.max(2, phase.sets + levelSets + (round > 1 ? 1 : 0));
  const restMul = profile.goal === "fat_loss" ? 0.7 : profile.goal === "strength" ? 1.25 : 1;
  const baseRest = Math.round((phase.rest * restMul) / 15) * 15;
  const repRange = phase.reps[profile.goal];

  const split = SPLITS[profile.daysPerWeek];
  // Sunday becomes a cardio day for fat-loss and general-fitness goals
  const cardioWeekday = profile.goal === "fat_loss" || profile.goal === "general" ? 6 : -1;

  // exercise selection per (month, template): varies every month and with every regenerate
  const pickCache = new Map<string, string[]>();
  const pickFor = (template: string, month: number) => {
    const key = `${template}:${month}`;
    if (pickCache.has(key)) return pickCache.get(key)!;
    const rng = mulberry32(seed * 31 + month * 7919 + template.length * 101 + template.charCodeAt(0));
    const used = new Set<string>();
    const ids = TEMPLATES[template].slots.slice(0, exPerDay).map((slot) => {
      const pool = POOLS[slot].filter((p) => !used.has(p));
      const choice = pool.length ? pool[Math.floor(rng() * pool.length)] : POOLS[slot][0];
      used.add(choice);
      return choice;
    });
    pickCache.set(key, ids);
    return ids;
  };

  const weeks: PlanWeek[] = [];
  for (let w = 0; w < numWeeks; w++) {
    const inBlock = w % 4;
    const isLast = w === numWeeks - 1;
    const deload = inBlock === 3 && !isLast;
    const label = isLast
      ? "Test week — log your best lifts"
      : deload
        ? "Deload — 60% load, fewer sets, recover"
        : ["Base load — leave 2-3 reps in reserve", "Add 2.5–5% load or +1 rep", "Push hard — RPE 8-9"][inBlock];

    const days: PlanDay[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(startDate, w * 7 + d);
      if (diffDays(date, endDate) <= 0) break;
      const wd = weekdayMon(date);
      const month = Math.min(2, Math.floor((w * 7 + d) / 30));
      const slotIdx = split.weekdays.indexOf(wd);

      if (slotIdx >= 0) {
        const template = split.templates[slotIdx];
        const sets = deload ? Math.max(2, Math.round(baseSets * 0.6)) : baseSets;
        const exercises: PlannedExercise[] = pickFor(template, month).map((id, i) => {
          if (id === "plank") return { id, sets, reps: `${30 + idx * 15 + round * 5}s`, restSec: 45 };
          if (id === "calf" || id === "crunch" || id === "leg_raise" || id === "mountain")
            return { id, sets, reps: id === "mountain" ? "30s" : "15-20", restSec: 45 };
          const compound = i < 2;
          return {
            id,
            sets: compound ? sets : Math.max(2, sets - 1),
            reps: compound ? repRange : profile.goal === "fat_loss" ? "12-15" : idx === 2 ? "8-10" : "10-12",
            restSec: compound ? baseRest : Math.max(45, baseRest - 30),
            note: compound && idx === 2 ? "Heavy — warm up with 2 lighter sets" : undefined,
          };
        });
        if (profile.goal === "fat_loss") {
          exercises.push({ id: ["burpee", "jack", "mountain"][w % 3], sets: 3, reps: "40s", restSec: 20, note: "Finisher" });
        }
        days.push({ date, title: TEMPLATES[template].title, focus: TEMPLATES[template].focus, type: "training", exercises });
      } else if (wd === cardioWeekday) {
        days.push({
          date,
          title: "Cardio & Mobility",
          focus: "Zone 2 conditioning",
          type: "cardio",
          exercises: [
            { id: "run", sets: 1, reps: `${20 + w * 2} min`, restSec: 0, note: "Conversational pace" },
            { id: "stretch", sets: 1, reps: "10 min", restSec: 0 },
          ],
        });
      } else {
        days.push({
          date,
          title: "Rest & Recovery",
          focus: "Sleep, walk, stretch",
          type: "rest",
          exercises: [{ id: "stretch", sets: 1, reps: "10-15 min", restSec: 0, note: "Light walk 20-30 min" }],
        });
      }
    }
    weeks.push({ index: w, label, deload, days });
  }

  return {
    id: `plan-${cycle}-${seed}`,
    cycle,
    phaseName: `Phase ${cycle} · ${phase.name}${round > 1 ? ` (Round ${round})` : ""}`,
    phaseSummary: phase.summary,
    startDate,
    endDate,
    createdAt: new Date().toISOString(),
    createdBy: opts.createdBy,
    seed,
    profileSnapshot: profile,
    weeks,
  };
}

export function findDay(plan: GymPlan | undefined, date: string): PlanDay | undefined {
  if (!plan) return undefined;
  for (const w of plan.weeks) for (const d of w.days) if (d.date === date) return d;
  return undefined;
}

export function newSeed() {
  return Math.floor(Math.random() * 1e9);
}
