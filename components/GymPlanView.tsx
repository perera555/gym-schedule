"use client";

import { useState } from "react";
import { addMonths, diffDays, formatDate, today } from "@/lib/date";
import { phaseFor, PHASES } from "@/lib/gymPlan";
import { GOAL_LABEL } from "@/lib/health";
import { currentPlan, type Actions } from "@/lib/store";
import type { AppState, PlanDay, PlannedExercise } from "@/lib/types";
import ExerciseList from "./ExerciseList";
import { Badge, Button, cx, TiltCard } from "./ui";

export default function GymPlanView({
  state,
  actions,
  onDemo,
  onPlay,
  onCheckIn,
  onExport,
}: {
  state: AppState;
  actions: Actions;
  onDemo: (id: string) => void;
  onPlay: (title: string, ex: PlannedExercise[], onDone: () => void) => void;
  onCheckIn: () => void;
  onExport: () => void;
}) {
  const cur = currentPlan(state);
  const [viewId, setViewId] = useState<string | null>(null);
  const plan = state.plans.find((p) => p.id === viewId) ?? cur;
  const t = today();
  const currentWeek = plan ? Math.floor(diffDays(plan.startDate, t) / 7) : 0;
  const [openWeek, setOpenWeek] = useState<number | null>(currentWeek >= 0 ? currentWeek : 0);
  if (!plan || !cur) return null;

  const upcoming = [1, 2].map((k) => {
    const cycle = cur.cycle + k;
    const start = addMonths(cur.endDate, 3 * (k - 1));
    const { idx, round } = phaseFor(cycle);
    return { cycle, name: `Phase ${cycle} · ${PHASES[idx].name}${round > 1 ? ` (R${round})` : ""}`, start, end: addMonths(start, 3) };
  });

  return (
    <div className="space-y-5">
      {/* Timeline */}
      <TiltCard max={2}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-cyan-300">3-month phases</div>
            <h2 className="text-xl font-black text-white">Your training timeline</h2>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" className="h-4 w-4 accent-cyan-400" checked={state.autoAdvance} onChange={(e) => actions.setAutoAdvance(e.target.checked)} />
            Auto check-in & regenerate every 3 months
          </label>
        </div>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {state.plans.map((p) => (
            <button
              key={p.id}
              onClick={() => setViewId(p.id)}
              className={cx(
                "btn3d min-w-56 shrink-0 rounded-2xl border p-3 text-left transition",
                p.id === plan.id ? "border-cyan-300/60 bg-cyan-400/10 shadow-[0_5px_0_#0e7490]" : "border-white/10 bg-white/5 shadow-[0_5px_0_rgba(255,255,255,.06)] hover:bg-white/10",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-white">{p.phaseName}</span>
                {p === cur ? <Badge tone="cyan">Active</Badge> : <Badge tone="green">Done</Badge>}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {formatDate(p.startDate, { month: "short", day: "numeric", year: "numeric" })} → {formatDate(p.endDate, { month: "short", day: "numeric", year: "numeric" })}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {p.profileSnapshot.weightKg} kg · {GOAL_LABEL[p.profileSnapshot.goal]} · {p.createdBy}
              </div>
            </button>
          ))}
          {upcoming.map((u) => (
            <div key={u.cycle} className="min-w-56 shrink-0 rounded-2xl border border-dashed border-white/15 p-3 opacity-70">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-slate-200">{u.name}</span>
                <Badge tone="slate">Upcoming</Badge>
              </div>
              <div className="mt-1 text-xs text-slate-400">
                from {formatDate(u.start, { month: "short", day: "numeric", year: "numeric" })}
              </div>
              <div className="mt-1 text-xs text-slate-500">Generated after your check-in</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 no-print">
          <Button variant="ghost" onClick={() => actions.regenerateCurrent()} title="Same phase and dates, new exercise selection">
            ↻ Regenerate current phase
          </Button>
          <Button variant="accent" onClick={onCheckIn} title="Ask for updated details and build the next phase now">
            ⏭ Check-in & start next phase now
          </Button>
          <Button variant="ghost" onClick={onExport}>
            📄 PDF / Print
          </Button>
        </div>
      </TiltCard>

      <div>
        <h3 className="text-lg font-bold text-white">{plan.phaseName}</h3>
        <p className="text-sm text-slate-400">{plan.phaseSummary}</p>
      </div>

      {/* Weeks */}
      <div className="space-y-3">
        {plan.weeks.map((w) => {
          const open = openWeek === w.index;
          const isCurrent = plan === cur && w.index === currentWeek;
          return (
            <div key={w.index} className={cx("glass rounded-2xl", isCurrent && "ring-1 ring-cyan-300/40")}>
              <button className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left" onClick={() => setOpenWeek(open ? null : w.index)}>
                <div>
                  <div className="font-bold text-white">
                    Week {w.index + 1}{" "}
                    <span className="text-xs font-normal text-slate-400">
                      {formatDate(w.days[0].date, { month: "short", day: "numeric" })} – {formatDate(w.days[w.days.length - 1].date, { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <div className={cx("text-xs", w.deload ? "text-orange-300" : "text-slate-400")}>{w.label}</div>
                </div>
                <div className="flex items-center gap-2">
                  {isCurrent && <Badge tone="cyan">This week</Badge>}
                  <span className="text-xs text-slate-400">
                    {w.days.filter((d) => state.completedDays.includes(d.date)).length}/{w.days.filter((d) => d.type !== "rest").length} done
                  </span>
                  <span className={cx("transition", open && "rotate-180")}>⌄</span>
                </div>
              </button>
              {open && (
                <div className="grid gap-3 border-t border-white/5 p-4 sm:grid-cols-2 xl:grid-cols-3">
                  {w.days.map((d) => (
                    <DayCard
                      key={d.date}
                      d={d}
                      done={state.completedDays.includes(d.date)}
                      isToday={d.date === t}
                      onToggle={() => actions.toggleDay(d.date)}
                      onDemo={onDemo}
                      onPlay={() => onPlay(d.title, d.exercises, () => !state.completedDays.includes(d.date) && actions.toggleDay(d.date))}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayCard({ d, done, isToday, onToggle, onDemo, onPlay }: { d: PlanDay; done: boolean; isToday: boolean; onToggle: () => void; onDemo: (id: string) => void; onPlay: () => void }) {
  return (
    <div
      className={cx(
        "rounded-2xl border p-3 transition hover:-translate-y-1 hover:shadow-[0_20px_30px_-15px_rgba(34,211,238,.35)]",
        isToday ? "border-cyan-300/50 bg-cyan-400/5" : "border-white/10 bg-white/[.02]",
        d.type === "rest" && "opacity-75",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-slate-400">{formatDate(d.date)}</div>
          <div className="font-bold text-white">{d.title}</div>
          <div className="text-xs text-slate-500">{d.focus}</div>
        </div>
        <label className="flex items-center gap-1 text-xs text-slate-300">
          <input type="checkbox" checked={done} onChange={onToggle} className="h-4 w-4 accent-emerald-400" />
          Done
        </label>
      </div>
      <div className="mt-3">
        <ExerciseList exercises={d.exercises} onDemo={onDemo} compact />
      </div>
      {d.type !== "rest" && (
        <button onClick={onPlay} className="mt-3 w-full rounded-xl bg-white/5 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/10">
          ▶ Play workout video
        </button>
      )}
    </div>
  );
}
