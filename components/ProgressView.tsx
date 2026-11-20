"use client";

import { useRef, useState } from "react";
import { addMonths, diffDays, formatDate, formatDuration, today, toISODate } from "@/lib/date";
import { phaseFor, PHASES } from "@/lib/gymPlan";
import { bmi, bmiLabel, GOAL_LABEL, LEVEL_LABEL } from "@/lib/health";
import { fileToAvatar } from "@/lib/photo";
import { currentPlan, type Actions } from "@/lib/store";
import type { AppState, GymPlan } from "@/lib/types";
import { WeightChart } from "./ProfileView";
import { Badge, Button, cx, Stat, TiltCard } from "./ui";

export function PhotoPicker({ photo, onChange, size = "h-28 w-28" }: { photo?: string; onChange: (p: string | undefined) => void; size?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState("");
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={cx("holo-photo group relative grid place-items-center overflow-hidden rounded-2xl", size)}
        title="Upload photo"
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="Member photo" className="h-full w-full object-cover" />
        ) : (
          <span className="text-center text-xs text-cyan-200">
            <span className="block text-3xl">📷</span>Add photo
          </span>
        )}
        <span className="scanline" />
        <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-[10px] font-semibold uppercase tracking-widest text-cyan-200 opacity-0 transition group-hover:opacity-100">
          {photo ? "Change" : "Upload"}
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          try {
            setErr("");
            onChange(await fileToAvatar(f));
          } catch (x) {
            setErr((x as Error).message);
          }
        }}
      />
      {photo && (
        <button type="button" className="text-[11px] text-slate-500 hover:text-rose-300" onClick={() => onChange(undefined)}>
          remove photo
        </button>
      )}
      {err && <span className="text-xs text-rose-300">{err}</span>}
    </div>
  );
}

function phaseStats(state: AppState, p: GymPlan, i: number) {
  const t = today();
  const days = p.weeks.flatMap((w) => w.days).filter((d) => diffDays(d.date, p.endDate) > 0);
  const training = days.filter((d) => d.type !== "rest");
  const elapsedTraining = training.filter((d) => diffDays(d.date, t) >= 0);
  const done = training.filter((d) => state.completedDays.includes(d.date)).length;
  const next = state.plans[i + 1];
  const active = !next;
  const startW = p.profileSnapshot.weightKg;
  const endW = next ? next.profileSnapshot.weightKg : state.member!.profile.weightKg;
  const visits = state.attendance.filter((a) => {
    const d = toISODate(new Date(a.timeIn));
    return diffDays(p.startDate, d) >= 0 && diffDays(d, p.endDate) > 0;
  });
  const visitMs = visits.reduce((s, a) => s + (a.timeOut ? new Date(a.timeOut).getTime() - new Date(a.timeIn).getTime() : 0), 0);
  const total = diffDays(p.startDate, p.endDate);
  const elapsed = Math.min(total, Math.max(0, diffDays(p.startDate, t) + 1));
  return {
    active,
    startW,
    endW,
    change: endW - startW,
    done,
    planned: training.length,
    compliance: elapsedTraining.length ? Math.round((done / elapsedTraining.length) * 100) : 0,
    visits: visits.length,
    visitMs,
    timePct: active ? Math.round((elapsed / total) * 100) : 100,
  };
}

function Ring({ pct, label, color = "#22d3ee" }: { pct: number; label: string; color?: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-24 w-24 place-items-center">
      <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="6" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, pct) / 100)} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      </svg>
      <div className="text-center">
        <div className="text-lg font-black text-white">{pct}%</div>
        <div className="text-[9px] uppercase tracking-widest text-slate-400">{label}</div>
      </div>
    </div>
  );
}

export default function ProgressView({ state, actions, onCheckIn }: { state: AppState; actions: Actions; onCheckIn: () => void }) {
  const m = state.member!;
  const p = m.profile;
  const plan = currentPlan(state);
  const b = bmi(p);
  const bl = bmiLabel(b);
  const first = state.checkIns[0];
  const startW = first?.weightKg ?? p.weightKg;
  const totalChange = p.weightKg - startW;
  const toTarget = p.targetWeightKg - p.weightKg;
  const targetSpan = p.targetWeightKg - startW;
  const targetPct = targetSpan === 0 ? 100 : Math.max(0, Math.min(100, Math.round((totalChange / targetSpan) * 100)));
  const closedMs = state.attendance.reduce((s, a) => s + (a.timeOut ? new Date(a.timeOut).getTime() - new Date(a.timeIn).getTime() : 0), 0);
  const cur = plan ? phaseStats(state, plan, state.plans.length - 1) : null;
  const daysToCheckIn = plan ? diffDays(today(), plan.endDate) : 0;
  const memberDays = diffDays(toISODate(new Date(m.joinedAt)), today()) + 1;

  const upcoming = plan
    ? [1, 2].map((k) => {
        const cycle = plan.cycle + k;
        const start = addMonths(plan.endDate, 3 * (k - 1));
        const { idx, round } = phaseFor(cycle);
        return { cycle, name: PHASES[idx].name + (round > 1 ? ` · Round ${round}` : ""), summary: PHASES[idx].summary, start, end: addMonths(start, 3) };
      })
    : [];

  const details: [string, string][] = [
    ["Age", `${p.age}`],
    ["Sex", p.sex === "male" ? "Male" : "Female"],
    ["Height", `${p.heightCm} cm`],
    ["Weight", `${p.weightKg} kg`],
    ["Target", `${p.targetWeightKg} kg`],
    ["BMI", `${b.toFixed(1)} · ${bl.label}`],
    ["Goal", GOAL_LABEL[p.goal]],
    ["Level", LEVEL_LABEL[p.level]],
    ["Training", `${p.daysPerWeek} days / week`],
    ["Joined", formatDate(toISODate(new Date(m.joinedAt)), { day: "numeric", month: "short", year: "numeric" })],
  ];

  return (
    <div className="space-y-6">
      {/* Futuristic member card */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_1fr]">
        <div className="holo-card rounded-[28px] p-[1.5px]">
          <div className="holo-inner relative overflow-hidden rounded-[27px] p-5 sm:p-7">
            <span className="corner tl" />
            <span className="corner tr" />
            <span className="corner bl" />
            <span className="corner br" />
            <div className="relative flex flex-wrap items-center justify-between gap-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.35em] text-cyan-300/80">IronForge · Athlete ID</div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> ACTIVE · DAY {memberDays}
              </div>
            </div>

            <div className="relative mt-5 flex flex-col gap-6 sm:flex-row">
              <PhotoPicker photo={m.photo} onChange={actions.setPhoto} size="h-40 w-40" />
              <div className="min-w-0 flex-1">
                <div className="text-3xl font-black uppercase tracking-wide text-white sm:text-4xl">{p.name}</div>
                <div className="mt-1 font-mono text-lg tracking-[0.2em] text-cyan-300 [text-shadow:0_0_12px_rgba(34,211,238,.8)]">{m.membershipNo}</div>
                <div className="mt-2 text-sm text-slate-400">{p.address}</div>
                {p.phone && <div className="text-sm text-slate-400">{p.phone}</div>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {plan && <Badge tone="cyan">{plan.phaseName}</Badge>}
                  <Badge tone="orange">{GOAL_LABEL[p.goal]}</Badge>
                  {state.cali && <Badge tone="rose">Military 21 · R{state.cali.round}</Badge>}
                </div>
              </div>
            </div>

            <div className="relative mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-cyan-300/15 bg-cyan-300/10 sm:grid-cols-5">
              {details.map(([k, v]) => (
                <div key={k} className="bg-[#060b17]/90 px-3 py-2.5">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-cyan-300/60">{k}</div>
                  <div className="truncate text-sm font-semibold text-white">{v}</div>
                </div>
              ))}
            </div>

            {cur && (
              <div className="relative mt-5">
                <div className="flex justify-between font-mono text-[11px] uppercase tracking-widest text-slate-400">
                  <span>Phase progress</span>
                  <span>{daysToCheckIn > 0 ? `${daysToCheckIn} days to next check-in` : "Check-in due"}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-linear-to-r from-cyan-400 via-sky-400 to-orange-400 shadow-[0_0_12px_rgba(34,211,238,.8)]" style={{ width: `${cur.timePct}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        <TiltCard className="flex flex-col justify-between gap-5">
          <div>
            <div className="text-xs uppercase tracking-widest text-cyan-300">Overall journey</div>
            <div className="mt-3 flex items-center justify-around">
              <Ring pct={targetPct} label="to target" color="#34d399" />
              <Ring pct={cur?.compliance ?? 0} label="this phase" />
              <Ring pct={cur?.timePct ?? 0} label="time" color="#f97316" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Start weight" value={`${startW} kg`} sub={first ? formatDate(first.date, { month: "short", year: "numeric" }) : ""} />
            <Stat
              label="Total change"
              value={<span className={totalChange > 0 ? "text-orange-300" : totalChange < 0 ? "text-emerald-300" : ""}>{`${totalChange > 0 ? "+" : ""}${totalChange.toFixed(1)} kg`}</span>}
              sub={totalChange > 0 ? "gained" : totalChange < 0 ? "lost" : "no change"}
            />
            <Stat label="To target" value={`${Math.abs(toTarget).toFixed(1)} kg`} sub={toTarget === 0 ? "reached 🎯" : toTarget > 0 ? "to gain" : "to lose"} />
            <Stat label="Workouts" value={state.completedDays.length} sub={`${state.attendance.length} gym visits · ${formatDuration(closedMs)}`} />
          </div>
          <Button variant="accent" onClick={onCheckIn}>
            Update my stats (check-in)
          </Button>
        </TiltCard>
      </div>

      <TiltCard max={2}>
        <h3 className="text-lg font-bold text-white">Weight trend</h3>
        <div className="mt-3">
          <WeightChart points={state.checkIns.map((c) => ({ date: c.date, w: c.weightKg }))} target={p.targetWeightKg} />
        </div>
      </TiltCard>

      {/* Phase by phase */}
      <div>
        <h3 className="text-lg font-bold text-white">Progress every 3 months</h3>
        <p className="text-sm text-slate-400">Each block is one 3-month phase. A new block appears after every check-in.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {state.plans.map((pl, i) => {
            const s = phaseStats(state, pl, i);
            return (
              <TiltCard key={pl.id} className={cx(s.active && "ring-1 ring-cyan-300/40")}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-widest text-slate-400">
                      Months {i * 3 + 1}–{i * 3 + 3}
                    </div>
                    <div className="text-lg font-black text-white">{pl.phaseName}</div>
                    <div className="text-xs text-slate-500">
                      {formatDate(pl.startDate, { day: "numeric", month: "short", year: "numeric" })} → {formatDate(pl.endDate, { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  {s.active ? <Badge tone="cyan">In progress</Badge> : <Badge tone="green">Completed</Badge>}
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <Ring pct={s.compliance} label="done" color={s.active ? "#22d3ee" : "#34d399"} />
                  <div className="grid flex-1 grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500">Weight</div>
                      <div className="font-semibold text-white">
                        {s.startW} → {s.endW} kg
                      </div>
                      <div className={cx("text-xs", s.change > 0 ? "text-orange-300" : s.change < 0 ? "text-emerald-300" : "text-slate-500")}>
                        {s.change === 0 ? "no change" : `${s.change > 0 ? "+" : ""}${s.change.toFixed(1)} kg${s.active ? " so far" : ""}`}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500">Workouts</div>
                      <div className="font-semibold text-white">
                        {s.done} / {s.planned}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500">Gym visits</div>
                      <div className="font-semibold text-white">{s.visits}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500">Time in gym</div>
                      <div className="font-semibold text-white">{formatDuration(s.visitMs)}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  Goal: {GOAL_LABEL[pl.profileSnapshot.goal]} · {LEVEL_LABEL[pl.profileSnapshot.level]} · {pl.profileSnapshot.daysPerWeek} days/wk
                </div>
              </TiltCard>
            );
          })}
          {upcoming.map((u, k) => (
            <div key={u.cycle} className="rounded-3xl border border-dashed border-white/15 p-5 opacity-70">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-widest text-slate-500">
                    Months {(state.plans.length + k) * 3 + 1}–{(state.plans.length + k) * 3 + 3}
                  </div>
                  <div className="text-lg font-black text-slate-200">
                    Phase {u.cycle} · {u.name}
                  </div>
                  <div className="text-xs text-slate-500">from {formatDate(u.start, { day: "numeric", month: "short", year: "numeric" })}</div>
                </div>
                <Badge tone="slate">Upcoming</Badge>
              </div>
              <p className="mt-3 text-sm text-slate-400">{u.summary}</p>
              <p className="mt-2 text-xs text-slate-500">🔒 Unlocks after your 3-month check-in</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
