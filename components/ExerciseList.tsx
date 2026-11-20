"use client";

import { getExercise } from "@/lib/exercises";
import type { PlannedExercise } from "@/lib/types";

export default function ExerciseList({ exercises, onDemo, compact }: { exercises: PlannedExercise[]; onDemo: (id: string) => void; compact?: boolean }) {
  return (
    <ul className="space-y-2">
      {exercises.map((pe, i) => {
        const ex = getExercise(pe.id);
        return (
          <li key={pe.id + i}>
            <button
              onClick={() => onDemo(pe.id)}
              className="group flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/[.03] px-3 py-2 text-left transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-cyan-400/5"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-linear-to-br from-cyan-400/30 to-indigo-500/30 text-xs font-bold text-cyan-100 shadow-[0_3px_0_rgba(8,145,178,.5)]">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">{ex.name}</span>
                {!compact && (
                  <span className="block truncate text-xs text-slate-400">
                    {ex.muscles}
                    {pe.note ? ` · ${pe.note}` : ""}
                  </span>
                )}
              </span>
              <span className="text-right text-xs">
                <span className="block font-bold text-cyan-200">
                  {pe.sets > 1 ? `${pe.sets} × ` : ""}
                  {pe.reps}
                </span>
                {pe.restSec > 0 && !compact && <span className="block text-slate-500">rest {pe.restSec}s</span>}
              </span>
              <span className="text-slate-500 transition group-hover:text-cyan-300" title="Watch 3D demo">
                ▶
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
