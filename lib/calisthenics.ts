import { addDays } from "./date";
import type { CaliDay, CaliProgram, Level, PlannedExercise } from "./types";

export const CALI_WEEKS = ["Basic Training", "Combat Conditioning", "Elite Readiness"];
export const CALI_SESSION_MIN = 20;

/** [exercise id, target reps per interval (0 = hold/time only)] */
const TEMPLATES: Record<string, { title: string; items: [id: string, target: number][] }> = {
  push: { title: "Push & Core", items: [["pushup", 12], ["diamond", 8], ["wide_pushup", 10], ["situp", 18], ["plank", 0]] },
  legs: { title: "Legs & Cardio", items: [["squat_bw", 22], ["lunge", 14], ["jump_squat", 12], ["highknees", 0], ["star", 12]] },
  circuit: { title: "Full-Body Circuit", items: [["burpee", 8], ["pushup", 12], ["mountain", 0], ["squat_bw", 20], ["flutter", 0]] },
  pull: { title: "Pull & Core", items: [["pullup", 5], ["chinup", 5], ["dip", 8], ["flutter", 0], ["plank", 0]] },
  endurance: { title: "Endurance Drill", items: [["highknees", 0], ["jack", 40], ["burpee", 10], ["star", 15], ["mountain", 0]] },
  drill: { title: "Drill Sergeant PT", items: [["pushup", 15], ["situp", 20], ["burpee", 10], ["jump_squat", 12], ["mountain", 0]] },
};

const ORDER = ["push", "legs", "circuit", "pull", "endurance", "drill"];

/** Work/rest seconds per interval for each week — every slot is 60 s so a day is ~20 min. */
const INTERVALS: [work: number, rest: number][] = [
  [40, 20],
  [45, 15],
  [50, 10],
];

const WARMUP: PlannedExercise = { id: "jack", sets: 1, reps: "150s", restSec: 0, note: "Warm-up — easy pace" };
const COOLDOWN: PlannedExercise = { id: "stretch", sets: 1, reps: "150s", restSec: 0, note: "Cool-down stretch" };

export function generateCali(opts: { startDate: string; level: Level; round: number; createdBy: "auto" | "manual" }): CaliProgram {
  const lvl = opts.level === "beginner" ? 0.7 : opts.level === "advanced" ? 1.35 : 1;
  const roundMul = 1 + 0.15 * (opts.round - 1);
  const days: CaliDay[] = [];

  for (let day = 1; day <= 21; day++) {
    const week = Math.floor((day - 1) / 7);
    const weekMul = [1, 1.2, 1.4][week];
    const date = addDays(opts.startDate, day - 1);

    if (day === 1 || day === 21) {
      days.push({
        day,
        date,
        type: "test",
        title: day === 1 ? "Initial PT Assessment" : "Final PT Test — Graduation",
        exercises: [
          { ...WARMUP, reps: "120s" },
          { id: "pushup", sets: 1, reps: "Max in 2 min", restSec: 0, note: "Record your score" },
          { id: "situp", sets: 1, reps: "Max in 2 min", restSec: 0, note: "Record your score" },
          { id: "pullup", sets: 1, reps: "60s max reps", restSec: 0, note: "Record your score" },
          { id: "run", sets: 1, reps: "12 min", restSec: 0, note: "Run as far as you can — record distance" },
        ],
      });
      continue;
    }
    if (day === 7 || day === 14) {
      days.push({
        day,
        date,
        type: "recovery",
        title: "Active Recovery",
        exercises: [
          { id: "run", sets: 1, reps: "14 min", restSec: 0, note: "Easy jog or brisk walk" },
          { id: "stretch", sets: 1, reps: "6 min", restSec: 0, note: "Full-body mobility" },
        ],
      });
      continue;
    }

    const [work, rest] = INTERVALS[week];
    const tpl = TEMPLATES[ORDER[(day - 2 - week) % ORDER.length]];
    const main: PlannedExercise[] = tpl.items.map(([id, base], i) => {
      const target = Math.max(1, Math.round(base * lvl * weekMul * roundMul));
      return {
        id,
        sets: 3,
        reps: base ? `${work}s · aim ${target}` : `${work}s`,
        restSec: rest,
        note: i === 0 ? `3 rounds · ${work}s on / ${rest}s off` : undefined,
      };
    });
    days.push({ day, date, type: "training", title: tpl.title, exercises: [WARMUP, ...main, COOLDOWN] });
  }

  return { round: opts.round, startDate: opts.startDate, level: opts.level, createdBy: opts.createdBy, days, completed: [] };
}
