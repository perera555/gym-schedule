"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./ui";

/** Free-running 20-minute (configurable) countdown for the daily military session. */
export default function SessionTimer({ minutes = 20, onFinish }: { minutes?: number; onFinish?: () => void }) {
  const total = minutes * 60;
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(false);
  const endAt = useRef<number | null>(null);
  const finishRef = useRef(onFinish);
  useEffect(() => {
    finishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    if (!running) return;
    // wall-clock based so it stays accurate even if the tab is in the background
    endAt.current = Date.now() + left * 1000;
    const id = setInterval(() => {
      const l = Math.max(0, Math.round((endAt.current! - Date.now()) / 1000));
      setLeft(l);
      if (l === 0) {
        setRunning(false);
        try {
          if ("speechSynthesis" in window) speechSynthesis.speak(new SpeechSynthesisUtterance("Time! 20 minute session complete."));
        } catch {}
        finishRef.current?.();
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const r = 70;
  const c = 2 * Math.PI * r;
  const pct = left / total;
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <div className="relative grid h-44 w-44 shrink-0 place-items-center">
        <svg viewBox="0 0 160 160" className="absolute inset-0 -rotate-90">
          <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="10" />
          <circle
            cx="80"
            cy="80"
            r={r}
            fill="none"
            stroke="url(#timerGrad)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            style={{ transition: "stroke-dashoffset .25s linear", filter: "drop-shadow(0 0 8px rgba(249,115,22,.7))" }}
          />
          <defs>
            <linearGradient id="timerGrad" x1="0" x2="1">
              <stop offset="0" stopColor="#f97316" />
              <stop offset="1" stopColor="#f43f5e" />
            </linearGradient>
          </defs>
        </svg>
        <div className="text-center">
          <div className="font-mono text-4xl font-black tabular-nums text-white">
            {mm}:{ss}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400">{left === 0 ? "Complete" : running ? "Remaining" : "Ready"}</div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-3 sm:items-start">
        <div className="text-sm text-slate-300">
          Daily session: <span className="font-bold text-white">{minutes} minutes</span>
        </div>
        <div className="flex gap-2">
          <Button variant="accent" onClick={() => (left === 0 ? (setLeft(total), setRunning(true)) : setRunning((x) => !x))} className="min-w-28">
            {running ? "⏸ Pause" : left === total || left === 0 ? "▶ Start" : "▶ Resume"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setRunning(false);
              setLeft(total);
            }}
          >
            ↺ Reset
          </Button>
        </div>
        <div className="text-xs text-slate-500">Use with the guided video, or on its own while you train.</div>
      </div>
    </div>
  );
}
