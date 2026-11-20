export type Sex = "male" | "female";
export type Goal = "fat_loss" | "muscle_gain" | "strength" | "general";
export type Level = "beginner" | "intermediate" | "advanced";

export interface Profile {
  name: string;
  address: string;
  phone: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  goal: Goal;
  level: Level;
  daysPerWeek: 3 | 4 | 5 | 6;
}

export interface Member {
  membershipNo: string;
  joinedAt: string; // ISO datetime
  profile: Profile;
  photo?: string; // small JPEG data URL
}

/** One saved snapshot of body stats, taken at registration and every 3-month check-in. */
export interface CheckIn {
  date: string; // YYYY-MM-DD
  weightKg: number;
  heightCm: number;
  goal: Goal;
  level: Level;
  note?: string;
}

/** Weekly progress update (member or admin), separate from the 3-month phase check-in. */
export interface ProgressLog {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  waistCm?: number;
  chestCm?: number;
  armCm?: number;
  hipsCm?: number;
  bodyFatPct?: number;
  energy?: 1 | 2 | 3 | 4 | 5;
  note?: string;
  by: "member" | "admin";
}

export interface PlannedExercise {
  id: string; // exercise library id
  sets: number;
  reps: string; // "8-12", "30s", "1.5 km"
  restSec: number;
  note?: string;
}

export interface PlanDay {
  date: string; // YYYY-MM-DD
  title: string;
  focus: string;
  type: "training" | "rest" | "cardio";
  exercises: PlannedExercise[];
}

export interface PlanWeek {
  index: number; // 0-based
  label: string;
  deload: boolean;
  days: PlanDay[];
}

export interface GymPlan {
  id: string;
  cycle: number; // 1, 2, 3, 4 ...
  phaseName: string;
  phaseSummary: string;
  startDate: string;
  endDate: string; // exclusive
  createdAt: string;
  createdBy: "auto" | "manual" | "registration";
  seed: number;
  profileSnapshot: Profile;
  weeks: PlanWeek[];
}

export interface Attendance {
  id: string;
  timeIn: string; // ISO datetime
  timeOut?: string; // ISO datetime
}

export interface CaliDay {
  day: number; // 1..21
  date: string;
  title: string;
  type: "training" | "recovery" | "test";
  exercises: PlannedExercise[];
}

export interface CaliProgram {
  round: number;
  startDate: string;
  level: Level;
  createdBy: "auto" | "manual";
  days: CaliDay[];
  completed: number[]; // day numbers
}

/** One member's saved data — each record is stored under its own localStorage key. */
export interface MemberRecord {
  id: string;
  member: Member;
  checkIns: CheckIn[];
  plans: GymPlan[];
  completedDays: string[];
  attendance: Attendance[];
  cali: CaliProgram | null;
  mealSeed?: number;
  progress?: ProgressLog[];
  updatedAt: string;
}

export interface Store {
  version: 2;
  members: MemberRecord[];
  activeId: string | null;
  guestCali: CaliProgram | null; // military program used without a membership
  autoAdvance: boolean;
  adminPinHash?: string;
}

/** The active member's data, as consumed by the dashboard views. */
export interface AppState {
  version: 1;
  member: Member | null;
  checkIns: CheckIn[];
  plans: GymPlan[]; // history; last one is current
  completedDays: string[]; // gym dates marked done
  attendance: Attendance[];
  cali: CaliProgram | null;
  mealSeed?: number;
  progress?: ProgressLog[];
  autoAdvance: boolean;
}
