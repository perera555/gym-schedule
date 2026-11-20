import { mulberry32 } from "./gymPlan";
import { nutrition } from "./health";
import type { GymPlan, Profile } from "./types";

/** [name, amount, unit, kcal, protein g] for that amount */
type Ing = [string, number, "g" | "ml" | "pc" | "cup" | "tbsp" | "tsp" | "slice", number, number];
interface MealOption {
  name: string;
  items: Ing[];
}
type Slot = "breakfast" | "snack" | "lunch" | "preworkout" | "postworkout" | "dinner" | "evening";

const MEALS: Record<Slot, MealOption[]> = {
  breakfast: [
    { name: "Oats, banana & eggs", items: [["Rolled oats", 60, "g", 228, 8], ["Milk (low-fat)", 200, "ml", 92, 7], ["Banana", 1, "pc", 105, 1], ["Boiled eggs", 2, "pc", 156, 13]] },
    { name: "String hoppers & dhal", items: [["String hoppers", 8, "pc", 280, 6], ["Dhal curry", 120, "g", 150, 9], ["Pol sambol", 1, "tbsp", 45, 1], ["Boiled egg", 1, "pc", 78, 6]] },
    { name: "Egg omelette & wholegrain toast", items: [["Eggs (omelette)", 3, "pc", 234, 19], ["Wholegrain bread", 2, "slice", 160, 8], ["Tomato & onion", 80, "g", 18, 1], ["Papaya", 150, "g", 64, 1]] },
    { name: "Kiribath & lunu miris with eggs", items: [["Kiribath (milk rice)", 150, "g", 270, 5], ["Lunu miris", 1, "tbsp", 25, 0], ["Boiled eggs", 2, "pc", 156, 13]] },
    { name: "Greek yogurt power bowl", items: [["Greek yogurt", 200, "g", 146, 20], ["Granola", 40, "g", 180, 4], ["Mixed berries / mango", 100, "g", 57, 1], ["Peanut butter", 1, "tbsp", 94, 4]] },
    { name: "Thosai with sambar", items: [["Thosai", 2, "pc", 266, 7], ["Sambar", 150, "g", 110, 5], ["Coconut chutney", 1, "tbsp", 50, 1], ["Boiled egg", 1, "pc", 78, 6]] },
  ],
  snack: [
    { name: "Fruit & nuts", items: [["Apple / guava", 1, "pc", 95, 0], ["Almonds / cashews", 20, "g", 116, 4]] },
    { name: "Yogurt & banana", items: [["Curd / yogurt", 150, "g", 92, 6], ["Banana", 1, "pc", 105, 1]] },
    { name: "Boiled chickpeas (kadala)", items: [["Chickpeas", 120, "g", 197, 10], ["Grated coconut", 1, "tbsp", 35, 0]] },
    { name: "Peanut butter toast", items: [["Wholegrain bread", 1, "slice", 80, 4], ["Peanut butter", 1, "tbsp", 94, 4]] },
    { name: "Boiled eggs & cucumber", items: [["Boiled eggs", 2, "pc", 156, 13], ["Cucumber", 100, "g", 15, 1]] },
  ],
  lunch: [
    { name: "Red rice & chicken curry", items: [["Red rice (cooked)", 200, "g", 222, 5], ["Chicken curry", 150, "g", 240, 30], ["Gotukola sambol", 60, "g", 40, 1], ["Dhal curry", 80, "g", 100, 6]] },
    { name: "Fish ambul thiyal with rice", items: [["Red rice (cooked)", 200, "g", 222, 5], ["Fish ambul thiyal", 130, "g", 200, 28], ["Beans curry", 80, "g", 60, 2], ["Salad", 80, "g", 20, 1]] },
    { name: "Chicken breast, sweet potato & veg", items: [["Grilled chicken breast", 150, "g", 248, 46], ["Sweet potato", 200, "g", 172, 3], ["Steamed broccoli / beans", 120, "g", 42, 3], ["Olive oil", 1, "tsp", 40, 0]] },
    { name: "Egg fried brown rice", items: [["Brown rice (cooked)", 200, "g", 224, 5], ["Eggs", 2, "pc", 156, 13], ["Mixed vegetables", 120, "g", 60, 3], ["Chicken pieces", 80, "g", 132, 20]] },
    { name: "Tuna & quinoa bowl", items: [["Quinoa (cooked)", 180, "g", 216, 8], ["Tuna (in water)", 120, "g", 132, 29], ["Avocado", 50, "g", 80, 1], ["Leafy salad", 80, "g", 15, 1]] },
    { name: "Rice, dhal & egg curry", items: [["Red rice (cooked)", 200, "g", 222, 5], ["Egg curry", 2, "pc", 220, 13], ["Dhal curry", 100, "g", 125, 8], ["Mallum", 60, "g", 50, 2]] },
  ],
  preworkout: [
    { name: "Banana & coffee", items: [["Banana", 1, "pc", 105, 1], ["Black coffee", 1, "cup", 5, 0], ["Dates", 3, "pc", 66, 0]] },
    { name: "Toast & honey", items: [["Wholegrain bread", 1, "slice", 80, 4], ["Honey", 1, "tsp", 21, 0], ["Banana", 1, "pc", 105, 1]] },
    { name: "Oat & date bites", items: [["Oats", 30, "g", 114, 4], ["Dates", 3, "pc", 66, 0]] },
  ],
  postworkout: [
    { name: "Whey shake & banana", items: [["Whey protein", 30, "g", 120, 24], ["Milk (low-fat)", 250, "ml", 115, 9], ["Banana", 1, "pc", 105, 1]] },
    { name: "Chocolate milk & eggs", items: [["Chocolate milk", 250, "ml", 190, 8], ["Boiled eggs", 2, "pc", 156, 13]] },
    { name: "Yogurt & granola", items: [["Greek yogurt", 200, "g", 146, 20], ["Granola", 30, "g", 135, 3]] },
  ],
  dinner: [
    { name: "Grilled fish & vegetables", items: [["Grilled fish (seer / tuna)", 150, "g", 200, 35], ["Roast vegetables", 200, "g", 120, 4], ["Red rice (cooked)", 120, "g", 133, 3]] },
    { name: "Chicken & chapati", items: [["Chapati / roti", 2, "pc", 240, 6], ["Chicken curry (dry)", 150, "g", 240, 30], ["Cucumber salad", 100, "g", 20, 1]] },
    { name: "Egg hoppers & seeni sambol", items: [["Egg hoppers", 2, "pc", 260, 14], ["Plain hoppers", 1, "pc", 100, 2], ["Seeni sambol", 1, "tbsp", 60, 0], ["Chicken curry", 80, "g", 130, 16]] },
    { name: "Lean beef / chicken stir-fry", items: [["Lean chicken / beef strips", 150, "g", 250, 36], ["Stir-fry vegetables", 200, "g", 90, 4], ["Noodles / rice (cooked)", 120, "g", 160, 4]] },
    { name: "Lentil & paneer / tofu curry", items: [["Paneer or tofu", 120, "g", 200, 18], ["Lentil curry", 150, "g", 170, 11], ["Chapati", 1, "pc", 120, 3]] },
    { name: "Pittu & fish curry", items: [["Pittu", 150, "g", 290, 5], ["Fish curry", 130, "g", 190, 26], ["Coconut milk gravy", 2, "tbsp", 60, 1]] },
  ],
  evening: [
    { name: "Warm milk & almonds", items: [["Warm milk", 200, "ml", 92, 7], ["Almonds", 15, "g", 87, 3]] },
    { name: "Casein-style curd", items: [["Curd / cottage cheese", 150, "g", 147, 16]] },
    { name: "Herbal tea", items: [["Herbal / ginger tea (no sugar)", 1, "cup", 2, 0]] },
  ],
};

export type EntryKind = "water" | "meal" | "workout" | "sleep" | "wake" | "supplement";
export interface FoodLine {
  name: string;
  amount: string;
  kcal: number;
  protein: number;
}
export interface MealEntry {
  time: string; // "07:00"
  kind: EntryKind;
  title: string;
  detail?: string;
  waterMl?: number;
  foods?: FoodLine[];
  kcal?: number;
  protein?: number;
}
export interface MealDay {
  date: string;
  training: boolean;
  entries: MealEntry[];
  totals: { kcal: number; protein: number; waterMl: number };
  target: { kcal: number; protein: number; waterMl: number };
}

function roundAmount(v: number, unit: Ing[2]) {
  if (unit === "g" || unit === "ml") return Math.max(5, Math.round(v / 10) * 10);
  if (unit === "pc" || unit === "slice") return Math.max(1, Math.round(v));
  return Math.max(0.5, Math.round(v * 2) / 2);
}

function scaleMeal(opt: MealOption, targetKcal: number) {
  const base = opt.items.reduce((s, i) => s + i[3], 0);
  const f = Math.max(0.6, Math.min(2.2, targetKcal / base));
  const foods: FoodLine[] = opt.items.map(([name, amt, unit, kcal, protein]) => {
    // drinks, condiments and single eggs don't scale as aggressively
    const scalable = !/coffee|tea|sambol|chutney|lunu|honey|oil/i.test(name);
    const a = scalable ? roundAmount(amt * f, unit) : amt;
    const r = a / amt;
    return { name, amount: `${a} ${unit === "pc" ? (a === 1 ? "pc" : "pcs") : unit}`, kcal: Math.round(kcal * r), protein: Math.round(protein * r) };
  });
  return { foods, kcal: foods.reduce((s, x) => s + x.kcal, 0), protein: foods.reduce((s, x) => s + x.protein, 0) };
}

/** Builds one day's eating & hydration timeline. Deterministic for (seed, date). */
export function mealDay(profile: Profile, seed: number, date: string, training: boolean, dayIndex: number): MealDay {
  const n = nutrition(profile);
  const kcalTarget = training ? n.calories : n.calories - (profile.goal === "muscle_gain" ? 0 : 150);
  const waterTarget = Math.round(n.waterL * 1000 + (training ? 500 : 0));
  const rng = mulberry32(seed + dayIndex * 977);
  const pick = (slot: Slot) => MEALS[slot][Math.floor(rng() * MEALS[slot].length)];
  const lateSnack = profile.goal === "muscle_gain" || profile.goal === "strength";

  // calorie split per slot
  const split: [Slot, number][] = training
    ? [["breakfast", 0.24], ["snack", 0.08], ["lunch", 0.28], ["preworkout", 0.07], ["postworkout", 0.11], ["dinner", 0.22]]
    : [["breakfast", 0.26], ["snack", 0.1], ["lunch", 0.3], ["snack", 0.09], ["dinner", 0.25]];
  if (lateSnack) split.push(["evening", 0.06]);
  const sum = split.reduce((s, x) => s + x[1], 0);

  const meal = (slot: Slot, share: number) => {
    const opt = pick(slot);
    const m = scaleMeal(opt, (kcalTarget * share) / sum);
    return { opt, ...m };
  };

  const entries: MealEntry[] = [];
  const water = (time: string, ml: number, detail?: string) => entries.push({ time, kind: "water", title: `Drink ${ml} ml water`, waterMl: ml, detail });
  const addMeal = (time: string, label: string, slot: Slot, share: number) => {
    const m = meal(slot, share);
    entries.push({ time, kind: "meal", title: `${label}: ${m.opt.name}`, foods: m.foods, kcal: m.kcal, protein: m.protein });
  };

  entries.push({ time: "06:00", kind: "wake", title: "Wake up", detail: "Open the curtains, 5 min light stretching" });
  water("06:15", 500, "Room-temperature water, optionally with lemon");
  addMeal("07:00", "Breakfast", "breakfast", split[0][1]);
  water("09:00", 250);
  addMeal("10:30", "Mid-morning snack", "snack", split[1][1]);
  water("11:30", 300);
  addMeal("13:00", "Lunch", "lunch", split[2][1]);
  water("14:30", 300);
  if (training) {
    addMeal("16:30", "Pre-workout", "preworkout", split[3][1]);
    water("17:00", 250, "Top up before training");
    entries.push({ time: "17:30", kind: "workout", title: "Workout", detail: "Sip 500 ml water during the session", waterMl: 500 });
    addMeal("19:00", "Post-workout", "postworkout", split[4][1]);
    addMeal("20:00", "Dinner", "dinner", split[5][1]);
  } else {
    addMeal("16:30", "Afternoon snack", "snack", split[3][1]);
    water("17:30", 300, "Light walk 20-30 min");
    addMeal("19:30", "Dinner", "dinner", split[4][1]);
  }
  if (lateSnack) addMeal("21:30", "Evening snack", "evening", split[split.length - 1][1]);

  // fill remaining water target in the evening
  const soFar = entries.reduce((s, e) => s + (e.waterMl ?? 0), 0);
  const rest = Math.max(0, waterTarget - soFar);
  if (rest > 0) water("21:00", Math.round(rest / 50) * 50, "Finish your daily water — stop 1 h before bed");
  entries.push({ time: "22:30", kind: "sleep", title: "Sleep", detail: "7-9 hours for recovery and fat loss / muscle growth" });
  entries.sort((a, b) => a.time.localeCompare(b.time));

  const totals = entries.reduce(
    (t, e) => ({ kcal: t.kcal + (e.kcal ?? 0), protein: t.protein + (e.protein ?? 0), waterMl: t.waterMl + (e.waterMl ?? 0) }),
    { kcal: 0, protein: 0, waterMl: 0 },
  );
  return { date, training, entries, totals, target: { kcal: kcalTarget, protein: n.protein, waterMl: waterTarget } };
}

/** Meal days for every date of a 3-month gym phase (training days get pre/post-workout meals). */
export function mealDaysForPlan(profile: Profile, seed: number, plan: GymPlan): MealDay[] {
  return plan.weeks
    .flatMap((w) => w.days)
    .map((d, i) => mealDay(profile, seed, d.date, d.type === "training", i));
}

export function fmt12(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
