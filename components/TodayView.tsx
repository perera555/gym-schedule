"use client";

import Link from "next/link";
import { getExercise } from "@/lib/exercises";
import { diffDays, formatDate, today } from "@/lib/date";
import { findDay, phaseFor, PHASES } from "@/lib/gymPlan";
import { nutrition } from "@/lib/health";
import { currentPlan, type Actions } from "@/lib/store";
import type { AppState, PlannedExercise } from "@/lib/types";
import ExerciseList from "./ExerciseList";
import Mannequin3D from "./Mannequin3D";
import { Badge, Button, Stat, TiltCard } from "./ui";

export default function TodayView({
  state,
  actions,
  onDemo,
  onPlay,
  onGoto,
  onCheckIn,
}: {
  state: AppState;
  actions: Actions;
  onDemo: (id: string) => void;
  onPlay: (title: string, ex: PlannedExercise[], onDone: () => void) => void;
  onGoto: (tab: string) => void;
  onCheckIn: () => void;
}) {
  const t = today();
  const plan = currentPlan(state);
  const day = findDay(plan, t);
  const done = state.completedDays.includes(t);
  const profile = state.member!.profile;
  const n = nutrition(profile);

  const total = plan ? diffDays(plan.startDate, plan.endDate) : 1;
  const elapsed = plan ? Math.min(total, Math.max(0, diffDays(plan.startDate, t) + 1)) : 0;
  const daysLeft = plan ? diffDays(t, plan.endDate) : 0;
  const nextPhase = plan ? phaseFor(plan.cycle + 1) : null;

  const cali = state.cali;
  const caliDayNo = cali ? diffDays(cali.startDate, t) + 1 : 0;
  const caliDay = cali && caliDayNo >= 1 && caliDayNo <= 21 ? cali.days[caliDayNo - 1] : undefined;

  const heroAnim = day && day.exercises[0] ? getExercise(day.exercises[0].id).anim : "stand";

  return (
    <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
      <TiltCard max={3}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-cyan-300">{formatDate(t, { weekday: "long", month: "long", day: "numeric" })}</div>
            <h2 className="mt-1 text-2xl font-black text-white">{day?.title ?? "No session"}</h2>
            <p className="text-sm text-slate-400">{day?.focus}</p>
          </div>
          {done ? <Badge tone="green">✓ Completed</Badge> : day?.type === "rest" ? <Badge tone="slate">Recovery</Badge> : <Badge tone="orange">Today</Badge>}
        </div>
        <div className="mt-4">{day && <ExerciseList exercises={day.exercises} onDemo={onDemo} />}</div>
        {day && (
          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="accent" onClick={() => onPlay(day.title, day.exercises, () => !done && actions.toggleDay(t))}>
              ▶ Play workout video
            </Button>
            <Button variant="ghost" onClick={() => actions.toggleDay(t)}>
              {done ? "Undo done" : "Mark as done"}
            </Button>
          </div>
        )}
      </TiltCard>

      <div className="space-y-5">
        <TiltCard className="overflow-hidden p-0">
          <div className="stage relative h-64">
            <Mannequin3D anim={heroAnim} autoRotate interactive={false} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-4">
              <div className="text-xs uppercase tracking-widest text-cyan-300">{plan?.phaseName}</div>
              <div className="text-sm text-slate-300">
                Day {elapsed} of {total} · {daysLeft > 0 ? `${daysLeft} days to your 3-month check-in` : "Check-in due!"}
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-linear-to-r from-cyan-400 to-orange-400" style={{ width: `${(elapsed / total) * 100}%` }} />
              </div>
            </div>
          </div>
        </TiltCard>

        {daysLeft <= 0 && (
          <TiltCard className="border-orange-300/40">
            <div className="font-bold text-orange-200">Your 3 months are complete 🎉</div>
            <p className="mt-1 text-sm text-slate-300">Update your weight and details to unlock {nextPhase ? `Phase ${plan!.cycle + 1} · ${PHASES[nextPhase.idx].name}` : "the next phase"}.</p>
            <Button className="mt-3" variant="accent" onClick={onCheckIn}>
              Start 3-month check-in
            </Button>
          </TiltCard>
        )}

        <TiltCard>
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-widest text-orange-300">Military Calisthenics 21</div>
            <Link className="text-xs text-slate-400 hover:text-white" href="/military">
              Open program →
            </Link>
          </div>
          {caliDay ? (
            <>
              <div className="mt-1 text-lg font-bold text-white">
                Day {caliDay.day}: {caliDay.title}
              </div>
              <div className="mt-3">
                <ExerciseList exercises={caliDay.exercises} onDemo={onDemo} compact />
              </div>
              <Button
                className="mt-3"
                onClick={() => onPlay(`Military Day ${caliDay.day}`, caliDay.exercises, () => !cali!.completed.includes(caliDay.day) && actions.toggleCaliDay(caliDay.day))}
              >
                ▶ Play Day {caliDay.day}
              </Button>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-400">{cali ? "Your current round starts soon." : "Start the 21-day military bodyweight program alongside your gym plan."}</p>
          )}
        </TiltCard>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
          <Stat label="Calories / day" value={n.calories} sub={`TDEE ${n.tdee}`} />
          <Stat label="Protein" value={`${n.protein} g`} sub="per day" />
          <Stat label="Water" value={`${n.waterL} L`} sub="per day" />
          <Stat label="Workouts done" value={state.completedDays.length} sub="all phases" />
        </div>
      </div>
    </div>
  );
}
