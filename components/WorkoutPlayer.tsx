"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getExercise } from "@/lib/exercises";
import type { PlannedExercise } from "@/lib/types";
import { DemoStage } from "./RealVideo";
import { Badge, Button, cx, Modal } from "./ui";

interface Step {
  kind: "work" | "rest" | "ready";
  exId: string;
  exIndex: number;
  set: number;
  sets: number;
  reps: string;
  seconds: number | null; // null = untimed, tap next
}

/** Estimate how long a set takes from its rep string. */
export function stepSeconds(reps: string, tempo: number): number | null {
  const s = reps.toLowerCase();
  const min = s.match(/(\d+(?:\.\d+)?)\s*min/);
  if (min) return Math.round(Number(min[1]) * 60);
  const sec = s.match(/^(\d+)\s*s/);
  if (sec) return Number(sec[1]);
  if (s.includes("km") || s.includes("max")) return null;
  const range = s.match(/(\d+)\s*-\s*(\d+)/);
  if (range) return Math.round(((Number(range[1]) + Number(range[2])) / 2) * tempo);
  const n = s.match(/^(\d+)/);
  if (n) return Math.round(Number(n[1]) * tempo);
  return null;
}

function buildSteps(exercises: PlannedExercise[]): Step[] {
  const steps: Step[] = [];
  exercises.forEach((pe, i) => {
    const ex = getExercise(pe.id);
    const base = { exId: pe.id, exIndex: i, sets: pe.sets, reps: pe.reps };
    if (i === 0) steps.push({ ...base, kind: "ready", set: 1, seconds: 8 });
    const lastEx = i === exercises.length - 1;
    for (let s = 1; s <= pe.sets; s++) {
      steps.push({ ...base, kind: "work", set: s, seconds: stepSeconds(pe.reps, ex.tempo) });
      if (s < pe.sets) {
        if (pe.restSec > 0) steps.push({ ...base, kind: "rest", set: s, seconds: pe.restSec });
      } else if (!lastEx) {
        // transition to the next exercise
        steps.push({ ...base, kind: "rest", set: s, seconds: Math.max(10, pe.restSec) });
      }
    }
  });
  return steps;
}

/** Total planned seconds for a workout (untimed steps count as 0). */
export function estimateSeconds(exercises: PlannedExercise[]): number {
  return buildSteps(exercises).reduce((s, st) => s + (st.seconds ?? 0), 0);
}

let audioCtx: AudioContext | null = null;
function beep(freq = 880, ms = 120) {
  try {
    audioCtx ??= new AudioContext();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.frequency.value = freq;
    g.gain.value = 0.08;
    o.connect(g).connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + ms / 1000);
  } catch {}
}

function say(text: string) {
  try {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  } catch {}
}

export default function WorkoutPlayer({
  open,
  title,
  exercises,
  onClose,
  onComplete,
}: {
  open: boolean;
  title: string;
  exercises: PlannedExercise[];
  onClose: () => void;
  onComplete?: () => void;
}) {
  const steps = useMemo(() => buildSteps(exercises), [exercises]);
  const [i, setI] = useState(0);
  const [left, setLeft] = useState<number | null>(steps[0]?.seconds ?? null);
  const [paused, setPaused] = useState(true);
  const [voice, setVoice] = useState(true);
  const [done, setDone] = useState(false);
  const [view, setView] = useState<"3d" | "video">("3d");
  const voiceRef = useRef(voice);
  useEffect(() => {
    voiceRef.current = voice;
  }, [voice]);

  const step = steps[i];
  const ex = step ? getExercise(step.exId) : null;
  const nextWork = steps.slice(i + 1).find((s) => s.kind !== "rest");

  const go = useCallback(
    (n: number) => {
      if (n >= steps.length) {
        setDone(true);
        setPaused(true);
        if (voiceRef.current) say("Workout complete. Outstanding work, soldier!");
        return;
      }
      const s = steps[Math.max(0, n)];
      setI(Math.max(0, n));
      setLeft(s.seconds);
      if (voiceRef.current) {
        const name = getExercise(s.exId).name;
        const upcoming = steps.slice(n + 1).find((x) => x.kind === "work");
        say(
          s.kind === "rest"
            ? `Rest ${s.seconds} seconds.${upcoming && upcoming.exIndex !== s.exIndex ? ` Next: ${getExercise(upcoming.exId).name}` : ""}`
            : s.kind === "ready"
              ? `Get ready. ${name}.`
              : s.set === 1
                ? `${name}. ${s.sets > 1 ? `Set 1 of ${s.sets}. ` : ""}Go!`
                : `Set ${s.set}. Go!`,
        );
      }
      beep(s.kind === "rest" ? 520 : 880);
    },
    [steps],
  );

  useEffect(() => {
    if (!open) return;
    setI(0);
    setLeft(steps[0]?.seconds ?? null);
    setPaused(true);
    setDone(false);
  }, [open, steps]);

  useEffect(() => {
    if (!open || paused || left === null || done) return;
    if (left <= 0) {
      go(i + 1);
      return;
    }
    const id = setTimeout(() => {
      if (left <= 4 && left > 1) beep(660, 80);
      setLeft((l) => (l === null ? l : l - 1));
    }, 1000);
    return () => clearTimeout(id);
  }, [open, paused, left, i, go, done]);

  // total session clock (counts while playing, including untimed steps)
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (open) setElapsed(0);
  }, [open, steps]);
  useEffect(() => {
    if (!open || paused || done) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [open, paused, done]);

  useEffect(() => {
    if (!open) speechSynthesis?.cancel?.();
  }, [open]);

  if (!open || !step || !ex) return null;

  const progress = ((i + 1) / steps.length) * 100;
  const fmt = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
  const remaining = (left ?? 0) + steps.slice(i + 1).reduce((s, st) => s + (st.seconds ?? 0), 0);
  const totalPlanned = steps.reduce((s, st) => s + (st.seconds ?? 0), 0);

  return (
    <Modal open={open} onClose={onClose} wide>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-cyan-300">Workout video</div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>
        <button onClick={onClose} className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/20" aria-label="Close">
          ✕
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative h-[340px] sm:h-[440px]">
          <DemoStage
            className="h-full"
            mode={view}
            onMode={setView}
            exerciseId={step.kind === "rest" && nextWork ? nextWork.exId : step.exId}
            anim={step.kind === "rest" ? "stand" : ex.anim}
            paused={paused && !done}
            speed={step.kind === "ready" ? 0.6 : 1}
            accent={step.kind === "rest" ? "#f97316" : "#22d3ee"}
          />
          <div className="pointer-events-none absolute left-0 top-0 p-3">
            <Badge tone={step.kind === "rest" ? "orange" : step.kind === "ready" ? "slate" : "cyan"}>
              {step.kind === "rest" ? "REST" : step.kind === "ready" ? "GET READY" : `SET ${step.set}/${step.sets}`}
            </Badge>
          </div>
          <div className={cx("pointer-events-none absolute inset-x-0 bottom-0 rounded-b-2xl bg-linear-to-t from-black/80 to-transparent p-4", view === "video" && "hidden")}>
            <div className="text-2xl font-black text-white sm:text-3xl">{step.kind === "rest" ? "Recover" : ex.name}</div>
            <div className="text-sm text-slate-300">{step.kind === "rest" ? `Next: ${nextWork ? getExercise(nextWork.exId).name : "finish"}` : `${step.reps} ${/^\d+(-\d+)?$/.test(step.reps) ? "reps" : ""}`}</div>
          </div>
          {done && (
            <div className="absolute inset-0 z-20 grid place-items-center rounded-2xl bg-black/70 text-center">
              <div>
                <div className="text-5xl">🏆</div>
                <div className="mt-2 text-2xl font-black text-white">Workout complete!</div>
                {onComplete && (
                  <Button
                    className="mt-4"
                    variant="accent"
                    onClick={() => {
                      onComplete();
                      onClose();
                    }}
                  >
                    Mark day as done
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-center">
            <div className="text-6xl font-black tabular-nums text-white text-3d">{left === null ? "∞" : fmt(left)}</div>
            <div className="mt-1 text-xs text-slate-400">{left === null ? "Untimed — tap Next when finished" : step.kind === "work" ? "Estimated time for this set" : "Countdown"}</div>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="ghost" onClick={() => go(i - 1)} disabled={i === 0}>
                ⏮
              </Button>
              <Button onClick={() => setPaused((p) => !p)} className="min-w-28">
                {paused ? "▶ Play" : "⏸ Pause"}
              </Button>
              <Button variant="ghost" onClick={() => go(i + 1)}>
                ⏭
              </Button>
            </div>
            <label className="mt-3 inline-flex items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={voice} onChange={(e) => setVoice(e.target.checked)} className="accent-cyan-400" /> Voice coach
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-white/10 bg-white/[.03] p-2">
              <div className="text-[10px] uppercase tracking-widest text-slate-400">Elapsed</div>
              <div className="font-mono text-lg font-bold text-cyan-200">{fmt(elapsed)}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[.03] p-2">
              <div className="text-[10px] uppercase tracking-widest text-slate-400">Remaining</div>
              <div className="font-mono text-lg font-bold text-orange-200">{fmt(remaining)}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[.03] p-2">
              <div className="text-[10px] uppercase tracking-widest text-slate-400">Session</div>
              <div className="font-mono text-lg font-bold text-white">{Math.round(totalPlanned / 60)} min</div>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-linear-to-r from-cyan-400 to-orange-400 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <div className="text-xs uppercase tracking-wider text-slate-400">Coaching cues</div>
            <ul className="mt-2 space-y-1 text-sm text-slate-200">
              {ex.cues.map((c) => (
                <li key={c}>✓ {c}</li>
              ))}
            </ul>
            <div className="mt-2 text-xs text-slate-400">Targets: {ex.muscles}</div>
          </div>
          <ol className="max-h-40 space-y-1 overflow-y-auto text-sm">
            {exercises.map((pe, k) => {
              const active = step.exIndex === k;
              return (
                <li key={pe.id + k} className={active ? "font-semibold text-cyan-200" : k < step.exIndex ? "text-slate-500 line-through" : "text-slate-400"}>
                  {k + 1}. {getExercise(pe.id).name} — {pe.sets}×{pe.reps}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </Modal>
  );
}

export function ExerciseDemo({ id, onClose }: { id: string | null; onClose: () => void }) {
  const [view, setView] = useState<"3d" | "video">("3d");
  if (!id) return null;
  const ex = getExercise(id);
  return (
    <Modal open onClose={onClose}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">{ex.name}</h2>
        <button onClick={onClose} className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/20" aria-label="Close">
          ✕
        </button>
      </div>
      <DemoStage className="h-[360px]" exerciseId={id} anim={ex.anim} mode={view} onMode={setView} autoRotate />
      <div className="mt-4 text-sm text-slate-300">Targets: {ex.muscles}</div>
      <ul className="mt-2 grid gap-1 text-sm text-slate-200 sm:grid-cols-2">
        {ex.cues.map((c) => (
          <li key={c}>✓ {c}</li>
        ))}
      </ul>
    </Modal>
  );
}
