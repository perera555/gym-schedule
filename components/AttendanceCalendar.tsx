"use client";

import { useState } from "react";
import { formatDuration, formatTime, toISODate } from "@/lib/date";
import type { Attendance } from "@/lib/types";
import { Button, cx } from "./ui";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Month calendar of gym visits with time in / time out on each day. */
export default function AttendanceCalendar({ attendance }: { attendance: Attendance[] }) {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [sel, setSel] = useState<string | null>(toISODate(now));

  const byDay = new Map<string, Attendance[]>();
  for (const a of attendance) {
    const k = toISODate(new Date(a.timeIn));
    byDay.set(k, [...(byDay.get(k) ?? []), a]);
  }
  const dur = (a: Attendance) => (a.timeOut ? new Date(a.timeOut).getTime() : Date.now()) - new Date(a.timeIn).getTime();

  const first = new Date(ym.y, ym.m, 1);
  const lead = (first.getDay() + 6) % 7;
  const daysIn = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysIn }, (_, i) => toISODate(new Date(ym.y, ym.m, i + 1)))];
  while (cells.length % 7) cells.push(null);

  const monthKey = `${ym.y}-${String(ym.m + 1).padStart(2, "0")}`;
  const monthVisits = attendance.filter((a) => toISODate(new Date(a.timeIn)).startsWith(monthKey));
  const monthMs = monthVisits.reduce((s, a) => s + (a.timeOut ? dur(a) : 0), 0);
  const todayKey = toISODate(now);
  const shift = (d: number) => setYm(({ y, m }) => ({ y: m + d < 0 ? y - 1 : m + d > 11 ? y + 1 : y, m: (m + d + 12) % 12 }));
  const selVisits = sel ? (byDay.get(sel) ?? []) : [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">{first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3>
          <div className="text-xs text-slate-400">
            {monthVisits.length} visits · {new Set(monthVisits.map((a) => toISODate(new Date(a.timeIn)))).size} days · {formatDuration(monthMs)}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="px-3" onClick={() => shift(-1)}>
            ‹
          </Button>
          <Button variant="ghost" className="px-3" onClick={() => setYm({ y: now.getFullYear(), m: now.getMonth() })}>
            Today
          </Button>
          <Button variant="ghost" className="px-3" onClick={() => shift(1)}>
            ›
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-slate-500">
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const v = byDay.get(d) ?? [];
          const ms = v.reduce((s, a) => s + dur(a), 0);
          const intensity = Math.min(1, ms / (90 * 60000));
          const open = v.some((a) => !a.timeOut);
          return (
            <button
              key={d}
              onClick={() => setSel(d)}
              style={v.length ? { background: `rgba(34,211,238,${0.12 + intensity * 0.35})` } : undefined}
              className={cx(
                "flex min-h-16 flex-col rounded-lg border p-1 text-left transition hover:border-cyan-300/50 sm:min-h-20 sm:p-1.5",
                v.length ? "border-cyan-300/30" : "border-white/5 bg-white/[.02]",
                sel === d && "ring-2 ring-orange-300",
                d === todayKey && "outline outline-1 outline-white/40",
              )}
            >
              <span className={cx("text-xs font-bold", v.length ? "text-white" : "text-slate-500")}>{Number(d.slice(8))}</span>
              {v.slice(0, 2).map((a) => (
                <span key={a.id} className="hidden truncate font-mono text-[9px] leading-tight text-cyan-50 sm:block">
                  {formatTime(a.timeIn)}–{a.timeOut ? formatTime(a.timeOut) : "now"}
                </span>
              ))}
              {v.length > 0 && <span className="mt-auto text-[9px] font-semibold text-cyan-100 sm:text-[10px]">{open ? "● in gym" : formatDuration(ms)}</span>}
            </button>
          );
        })}
      </div>

      {sel && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.03] p-3">
          <div className="text-sm font-semibold text-white">{new Date(sel + "T00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
          {selVisits.length === 0 ? (
            <div className="mt-1 text-xs text-slate-400">No visit on this day.</div>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {selVisits.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-emerald-200">IN {formatTime(a.timeIn)}</span>
                  <span className="font-mono text-rose-200">OUT {a.timeOut ? formatTime(a.timeOut) : "—"}</span>
                  <span className="text-slate-400">{formatDuration(dur(a))}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
