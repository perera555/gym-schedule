"use client";

import { useState } from "react";
import { CALI_SESSION_MIN, CALI_WEEKS } from "@/lib/calisthenics";
import SessionTimer from "./SessionTimer";
import { estimateSeconds } from "./WorkoutPlayer";
import { addDays, diffDays, formatDate, today } from "@/lib/date";
import { EXERCISES, getExercise } from "@/lib/exercises";
import { LEVEL_LABEL } from "@/lib/health";
import type { Actions } from "@/lib/store";
import type { AppState, Level, PlannedExercise } from "@/lib/types";
import ExerciseList from "./ExerciseList";
import Mannequin3D from "./Mannequin3D";
import { Badge, Button, cx, inputCls, TiltCard } from "./ui";

const LIBRARY = ["pushup", "diamond", "wide_pushup", "situp", "flutter", "plank", "squat_bw", "jump_squat", "lunge", "burpee", "mountain", "jack", "star", "highknees", "pullup", "chinup", "dip", "run"];

export default function CaliView({
  state,
  actions,
  onDemo,
  onPlay,
}: {
  state: AppState;
  actions: Actions;
  onDemo: (id: string) => void;
  onPlay: (title: string, ex: PlannedExercise[], onDone: () => void) => void;
}) {
  const t = today();
  const cali = state.cali;
  const [start, setStart] = useState(t);
  const [level, setLevel] = useState<Level>(state.member?.profile.level ?? "beginner");
  const todayNo = cali ? diffDays(cali.startDate, t) + 1 : 0;
  const [sel, setSel] = useState<number>(Math.min(21, Math.max(1, todayNo || 1)));

  if (!cali) {
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        <TiltCard className="overflow-hidden p-0">
          <div className="stage h-80">
            <Mannequin3D anim="burpee" autoRotate accent="#f97316" />
          </div>
        </TiltCard>
        <TiltCard>
          <div className="text-xs uppercase tracking-widest text-orange-300">Separate program</div>
          <h2 className="mt-1 text-3xl font-black text-white">Military Calisthenics 21</h2>
          <p className="mt-2 text-sm text-slate-300">
            21 days of boot-camp-style bodyweight training, scaled to your level: PT assessment on day 1,
            three progressive weeks ({CALI_WEEKS.join(" → ")}), and a graduation PT test on day 21. Every day is a 20-minute session (warm-up, 3-round interval circuit, cool-down) with a countdown timer, 3D exercise videos and a voice coach.
          </p>
          <p className="mt-2 text-sm text-slate-400">When a round ends, the next harder round starts on its own (if auto-regenerate is on), or you can restart any time.</p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">Start date</span>
              <input type="date" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">Fitness level</span>
              <select className={inputCls} value={level} onChange={(e) => setLevel(e.target.value as Level)}>
                {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => (
                  <option key={l} value={l}>
                    {LEVEL_LABEL[l]}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="accent" onClick={() => actions.startCali(start, 1, level)}>
              Start 21-day program
            </Button>
          </div>
        </TiltCard>
      </div>
    );
  }

  const day = cali.days[sel - 1];
  const doneCount = cali.completed.length;

  return (
    <div className="space-y-5">
      <TiltCard max={2}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-orange-300">
              Military Calisthenics 21 · Round {cali.round} · {LEVEL_LABEL[cali.level]}
            </div>
            <h2 className="text-xl font-black text-white">
              {todayNo >= 1 && todayNo <= 21 ? `Day ${todayNo} of 21` : todayNo < 1 ? `Starts ${formatDate(cali.startDate)}` : "Round complete"}
            </h2>
            <div className="text-xs text-slate-400">
              {formatDate(cali.startDate, { month: "short", day: "numeric" })} → {formatDate(addDays(cali.startDate, 20), { month: "short", day: "numeric" })} · {doneCount}/21 completed
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => confirm("Restart the 21-day program from today?") && actions.startCali(t, cali.round)}>
              ↻ Restart this round
            </Button>
            <Button variant="accent" onClick={() => confirm(`Start round ${cali.round + 1} (harder) from today?`) && actions.startCali(t)}>
              ⏭ Next round now
            </Button>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-linear-to-r from-orange-400 to-rose-500" style={{ width: `${(doneCount / 21) * 100}%` }} />
        </div>

        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((w) => (
            <div key={w}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Week {w + 1} · {CALI_WEEKS[w]}
              </div>
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {cali.days.slice(w * 7, w * 7 + 7).map((d) => {
                  const done = cali.completed.includes(d.day);
                  const isToday = d.day === todayNo;
                  return (
                    <button
                      key={d.day}
                      onClick={() => setSel(d.day)}
                      className={cx(
                        "btn3d relative aspect-square rounded-xl border text-center transition",
                        sel === d.day ? "border-orange-300 bg-orange-400/20 shadow-[0_5px_0_#c2410c]" : "border-white/10 bg-white/5 shadow-[0_5px_0_rgba(255,255,255,.06)] hover:bg-white/10",
                        done && "bg-emerald-400/15",
                        isToday && "ring-2 ring-cyan-300",
                      )}
                    >
                      <span className="block text-base font-black text-white sm:text-xl">{d.day}</span>
                      <span className="hidden text-[10px] text-slate-400 sm:block">{d.type === "test" ? "TEST" : d.type === "recovery" ? "REST" : formatDate(d.date, { weekday: "short" })}</span>
                      {done && <span className="absolute right-1 top-0.5 text-xs text-emerald-300">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </TiltCard>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <TiltCard className="overflow-hidden p-0">
          <div className="stage h-80">
            <Mannequin3D anim={getExercise(day.exercises[0].id).anim} autoRotate accent="#f97316" />
          </div>
        </TiltCard>
        <TiltCard>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs text-slate-400">{formatDate(day.date, { weekday: "long", month: "short", day: "numeric" })}</div>
              <h3 className="text-xl font-black text-white">
                Day {day.day}: {day.title}
              </h3>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge tone={day.type === "test" ? "rose" : day.type === "recovery" ? "slate" : "orange"}>{day.type}</Badge>
              <Badge tone="slate">⏱ {Math.round(estimateSeconds(day.exercises) / 60)} min</Badge>
            </div>
          </div>
          <div className="mt-4">
            <ExerciseList exercises={day.exercises} onDemo={onDemo} />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="accent" onClick={() => onPlay(`Military Day ${day.day}: ${day.title}`, day.exercises, () => !cali.completed.includes(day.day) && actions.toggleCaliDay(day.day))}>
              ▶ Play Day {day.day} video
            </Button>
            <Button variant="ghost" onClick={() => actions.toggleCaliDay(day.day)}>
              {cali.completed.includes(day.day) ? "Undo done" : "Mark as done"}
            </Button>
          </div>
        </TiltCard>
      </div>

      <TiltCard max={2}>
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <h3 className="text-lg font-bold text-white">⏱ 20-minute session timer</h3>
          <span className="text-xs text-slate-400">Day {day.day}</span>
        </div>
        <SessionTimer key={`${cali.round}-${day.day}`} minutes={CALI_SESSION_MIN} />
      </TiltCard>

      <TiltCard max={2}>
        <h3 className="text-lg font-bold text-white">3D exercise video library</h3>
        <p className="text-sm text-slate-400">Tap any movement to watch the 3D demo. Drag to rotate the view.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {LIBRARY.map((id) => (
            <button
              key={id}
              onClick={() => onDemo(id)}
              className="btn3d rounded-xl border border-white/10 bg-linear-to-br from-white/10 to-white/[.02] p-3 text-left shadow-[0_5px_0_rgba(255,255,255,.06)] transition hover:border-orange-300/40"
            >
              <div className="text-lg">▶</div>
              <div className="text-sm font-semibold text-white">{EXERCISES[id].name}</div>
              <div className="truncate text-[11px] text-slate-400">{EXERCISES[id].muscles}</div>
            </button>
          ))}
        </div>
      </TiltCard>
    </div>
  );
}
