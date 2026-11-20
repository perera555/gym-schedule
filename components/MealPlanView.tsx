"use client";

import { useMemo, useState } from "react";
import { diffDays, formatDate, today } from "@/lib/date";
import { fmt12, mealDaysForPlan, proteinShakePlan, type EntryKind } from "@/lib/meals";
import { nutrition } from "@/lib/health";
import { currentPlan, type Actions } from "@/lib/store";
import type { AppState } from "@/lib/types";
import { Badge, Button, cx, Stat, TiltCard } from "./ui";

const ICON: Record<EntryKind, string> = { water: "💧", meal: "🍽", workout: "🏋", sleep: "🌙", wake: "☀️", supplement: "🥤" };
const TONE: Record<EntryKind, string> = {
  water: "border-sky-300/30 bg-sky-400/10",
  meal: "border-emerald-300/30 bg-emerald-400/10",
  workout: "border-orange-300/40 bg-orange-400/10",
  sleep: "border-indigo-300/30 bg-indigo-400/10",
  wake: "border-amber-300/30 bg-amber-400/10",
  supplement: "border-violet-300/40 bg-violet-400/10",
};

function Bar({ label, value, target, unit, color }: { label: string; value: number; target: number; unit: string; color: string }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, target)) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-semibold text-white">
          {value} / {target} {unit}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
        <div className={cx("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function MealPlanView({ state, actions, onExport }: { state: AppState; actions: Actions; onExport: () => void }) {
  const plan = currentPlan(state);
  const p = state.member!.profile;
  const seed = state.mealSeed;
  const days = useMemo(() => (plan && seed !== undefined ? mealDaysForPlan(p, seed, plan) : []), [plan, seed, p]);
  const t = today();
  const todayIdx = Math.max(0, days.findIndex((d) => d.date === t));
  const [idx, setIdx] = useState(todayIdx);
  const n = nutrition(p);

  if (seed === undefined || !plan) {
    return (
      <TiltCard className="mx-auto max-w-2xl text-center">
        <div className="text-5xl">🥗</div>
        <h2 className="mt-2 text-2xl font-black text-white">No meal plan yet</h2>
        <p className="mt-2 text-sm text-slate-400">
          Want a day-by-day meal & water timeline for your 3-month phase? Portions are sized to your target of <b className="text-white">{n.calories} kcal</b> and{" "}
          <b className="text-white">{n.protein} g protein</b> per day.
        </p>
        <Button className="mt-5" variant="accent" onClick={actions.newMealPlan}>
          + Add meal plan
        </Button>
      </TiltCard>
    );
  }

  const day = days[Math.min(idx, days.length - 1)];
  const weekStart = Math.floor(idx / 7) * 7;
  const week = days.slice(weekStart, weekStart + 7);

  return (
    <div className="space-y-5">
      <TiltCard max={2}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-emerald-300">3-month meal plan · {plan.phaseName}</div>
            <h2 className="text-xl font-black text-white">
              Day {idx + 1} of {days.length}
            </h2>
            <div className="text-xs text-slate-400">
              {formatDate(days[0].date, { day: "numeric", month: "short" })} → {formatDate(days[days.length - 1].date, { day: "numeric", month: "short", year: "numeric" })} · regenerates with each 3-month check-in
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => confirm("Create a new meal plan with different meals?") && actions.newMealPlan()}>
              🔄 Get new meal plan
            </Button>
            <Button variant="ghost" onClick={onExport}>
              📄 PDF / Print
            </Button>
            <Button variant="ghost" onClick={() => confirm("Remove the meal plan for this member?") && actions.removeMealPlan()}>
              ✕ Remove
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button variant="ghost" className="px-3" disabled={weekStart === 0} onClick={() => setIdx(Math.max(0, weekStart - 7))}>
            ‹
          </Button>
          <div className="grid flex-1 grid-cols-7 gap-1.5">
            {week.map((d, k) => {
              const i = weekStart + k;
              const isToday = d.date === t;
              return (
                <button
                  key={d.date}
                  onClick={() => setIdx(i)}
                  className={cx(
                    "btn3d rounded-xl border px-1 py-2 text-center transition",
                    i === idx ? "border-emerald-300 bg-emerald-400/20 shadow-[0_4px_0_#047857]" : "border-white/10 bg-white/5 shadow-[0_4px_0_rgba(255,255,255,.06)] hover:bg-white/10",
                    isToday && "ring-2 ring-cyan-300",
                  )}
                >
                  <div className="text-[10px] uppercase text-slate-400">{formatDate(d.date, { weekday: "short" })}</div>
                  <div className="text-base font-black text-white">{formatDate(d.date, { day: "numeric" })}</div>
                  <div className="text-[10px]">{d.training ? "🏋" : "😴"}</div>
                </button>
              );
            })}
          </div>
          <Button variant="ghost" className="px-3" disabled={weekStart + 7 >= days.length} onClick={() => setIdx(Math.min(days.length - 1, weekStart + 7))}>
            ›
          </Button>
        </div>
        {diffDays(t, day.date) !== 0 && days.some((d) => d.date === t) && (
          <button className="mt-2 text-xs text-cyan-300 hover:text-cyan-200" onClick={() => setIdx(todayIdx)}>
            ← back to today
          </button>
        )}
      </TiltCard>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <TiltCard max={2}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-white">{formatDate(day.date, { weekday: "long", day: "numeric", month: "long" })}</h3>
            <Badge tone={day.training ? "orange" : "slate"}>{day.training ? "Training day" : "Rest day"}</Badge>
          </div>
          <ol className="relative space-y-3 border-l-2 border-white/10 pl-5">
            {day.entries.map((e, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[31px] top-2 grid h-5 w-5 place-items-center rounded-full bg-[#0b1324] text-xs ring-2 ring-white/10">{ICON[e.kind]}</span>
                <div className={cx("rounded-2xl border p-3", TONE[e.kind])}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-sm font-bold text-white">{fmt12(e.time)}</span>
                      <span className="text-sm font-semibold text-white">{e.title}</span>
                    </div>
                    {e.kcal ? (
                      <span className="text-xs text-emerald-200">
                        {e.kcal} kcal · {e.protein} g protein
                      </span>
                    ) : e.waterMl ? (
                      <span className="text-xs text-sky-200">{e.waterMl} ml</span>
                    ) : null}
                  </div>
                  {e.foods && (
                    <ul className="mt-2 grid gap-x-4 gap-y-0.5 text-xs text-slate-300 sm:grid-cols-2">
                      {e.foods.map((f) => (
                        <li key={f.name} className="flex justify-between gap-2">
                          <span>{f.name}</span>
                          <span className="text-slate-400">{f.amount}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {e.detail && <div className="mt-1 text-xs text-slate-400">{e.detail}</div>}
                </div>
              </li>
            ))}
          </ol>
        </TiltCard>

        <div className="space-y-5">
          <TiltCard>
            <h3 className="font-bold text-white">Daily totals</h3>
            <div className="mt-3 space-y-3">
              <Bar label="Calories" value={day.totals.kcal} target={day.target.kcal} unit="kcal" color="bg-emerald-400" />
              <Bar label="Protein (minimum)" value={day.totals.protein} target={day.target.protein} unit="g" color="bg-orange-400" />
              <Bar label="Water" value={day.totals.waterMl} target={day.target.waterMl} unit="ml" color="bg-sky-400" />
            </div>
          </TiltCard>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Goal calories" value={n.calories} sub={`maintenance ${n.tdee}`} />
            <Stat label="Protein" value={`${n.protein} g`} sub="per day" />
            <Stat label="Water" value={`${n.waterL} L`} sub="+0.5 L on training days" />
            <Stat label="Meals" value={day.entries.filter((e) => e.kind === "meal").length} sub="today" />
          </div>
          <TiltCard className="border-violet-300/30">
            <h3 className="font-bold text-white">🥤 Protein drink guide</h3>
            {(() => {
              const s = proteinShakePlan(p);
              return (
                <div className="mt-2 space-y-2 text-sm text-slate-300">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-white/5 p-2">
                      <div className="text-lg font-black text-white">{s.dailyProtein} g</div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">protein / day</div>
                    </div>
                    <div className="rounded-xl bg-white/5 p-2">
                      <div className="text-lg font-black text-violet-200">{s.allowed ? `${s.trainingScoops}×` : "0"}</div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">scoop on gym day</div>
                    </div>
                    <div className="rounded-xl bg-white/5 p-2">
                      <div className="text-lg font-black text-white">{s.fromFood} g</div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">from food</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">{s.perKg} g protein per kg body weight. 1 scoop = 30 g powder ≈ 24 g protein.</div>
                  <ul className="space-y-1">
                    {s.timing.map((x) => (
                      <li key={x}>• {x}</li>
                    ))}
                  </ul>
                  <div className="text-xs text-slate-500">Choose a third-party tested whey or plant protein. Food comes first — shakes only fill the gap. Ask a doctor first if you have kidney problems.</div>
                </div>
              );
            })()}
          </TiltCard>
          <TiltCard>
            <h3 className="font-bold text-white">Tips</h3>            <ul className="mt-2 space-y-1 text-sm text-slate-300">
              <li>• Weigh food raw where possible; amounts are approximate.</li>
              <li>• Swap any meal for a similar one with the same protein.</li>
              <li>• Limit sugar drinks, fried food and alcohol.</li>
              <li>• Check with a doctor or dietitian if you have a medical condition or allergy.</li>
            </ul>
          </TiltCard>
        </div>
      </div>
    </div>
  );
}
