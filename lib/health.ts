import type { Profile } from "./types";

export function bmi(p: Pick<Profile, "heightCm" | "weightKg">) {
  const m = p.heightCm / 100;
  return m > 0 ? p.weightKg / (m * m) : 0;
}

export function bmiLabel(v: number) {
  if (v < 18.5) return { label: "Underweight", color: "text-sky-300" };
  if (v < 25) return { label: "Healthy", color: "text-emerald-300" };
  if (v < 30) return { label: "Overweight", color: "text-amber-300" };
  return { label: "Obese", color: "text-rose-300" };
}

export function nutrition(p: Profile) {
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === "male" ? 5 : -161);
  const activity = { 3: 1.45, 4: 1.55, 5: 1.65, 6: 1.75 }[p.daysPerWeek];
  const tdee = bmr * activity;
  const delta = { fat_loss: -450, muscle_gain: 300, strength: 150, general: 0 }[p.goal];
  const proteinPerKg = { fat_loss: 2.0, muscle_gain: 2.0, strength: 1.8, general: 1.6 }[p.goal];
  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories: Math.round(tdee + delta),
    protein: Math.round(p.weightKg * proteinPerKg),
    waterL: Math.round((p.weightKg * 0.035 + 0.5) * 10) / 10,
  };
}

export const GOAL_LABEL = {
  fat_loss: "Fat Loss",
  muscle_gain: "Muscle Gain",
  strength: "Strength",
  general: "General Fitness",
} as const;

export const LEVEL_LABEL = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" } as const;
