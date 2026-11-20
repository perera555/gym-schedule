"use client";

import { useEffect, useState } from "react";
import { formatDate, formatDuration, formatTime, toISODate } from "@/lib/date";
import type { Actions } from "@/lib/store";
import type { AppState } from "@/lib/types";
import AttendanceCalendar from "./AttendanceCalendar";
import { Button, cx, Stat, TiltCard } from "./ui";

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** Deterministic pseudo-barcode from the membership number. */
function Barcode({ code }: { code: string }) {
  const bars = Array.from(code + code).map((c, i) => ((c.charCodeAt(0) * (i + 3)) % 4) + 1);
  return (
    <div className="flex h-10 items-stretch gap-[2px]">
      {bars.map((w, i) => (
        <span key={i} className="bg-slate-900" style={{ width: w }} />
      ))}
    </div>
  );
}

export function TimeClock({ state, actions, compact }: { state: AppState; actions: Actions; compact?: boolean }) {
  const now = useNow();
  const open = state.attendance.find((a) => !a.timeOut);
  return (
    <div className={cx("flex items-center gap-3", compact ? "" : "flex-wrap")}>
      {open ? (
        <>
          <span className="flex items-center gap-2 text-sm text-emerald-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            In since {formatTime(open.timeIn)} · {formatDuration(now - new Date(open.timeIn).getTime())}
          </span>
          <Button variant="danger" onClick={actions.timeOut}>
            Time out
          </Button>
        </>
      ) : (
        <Button onClick={actions.timeIn}>Time in</Button>
      )}
    </div>
  );
}

export default function MembershipView({ state, actions }: { state: AppState; actions: Actions }) {
  const [flipped, setFlipped] = useState(false);
  const m = state.member!;
  const p = m.profile;
  const now = useNow(30_000);
  const month = toISODate(new Date()).slice(0, 7);

  const closed = state.attendance.filter((a) => a.timeOut);
  const totalMs = closed.reduce((s, a) => s + (new Date(a.timeOut!).getTime() - new Date(a.timeIn).getTime()), 0);
  const thisMonth = state.attendance.filter((a) => toISODate(new Date(a.timeIn)).startsWith(month));
  const rows = [...state.attendance].reverse();

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
      <div className="space-y-4">
        <div className={cx("flip cursor-pointer", flipped && "flipped")} onClick={() => setFlipped((f) => !f)}>
          <div className="flip-inner relative aspect-[1.586] w-full">
            <div className="flip-face absolute inset-0 overflow-hidden rounded-3xl bg-linear-to-br from-cyan-400 via-sky-600 to-indigo-800 p-5 shadow-[0_30px_60px_-20px_rgba(34,211,238,.6)]">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
              <div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-orange-400/20" />
              <div className="relative flex h-full flex-col justify-between text-white">
                <div className="flex items-start justify-between">
                  <div className="text-lg font-black tracking-widest">IRONFORGE</div>
                  <div className="rounded-md bg-black/25 px-2 py-0.5 text-[10px] uppercase tracking-widest">Member</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-white/70">Membership No.</div>
                  <div className="font-mono text-2xl font-bold tracking-wider drop-shadow">{m.membershipNo}</div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-white/70">Name</div>
                    <div className="font-semibold">{p.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-widest text-white/70">Since</div>
                    <div className="font-semibold">{formatDate(toISODate(new Date(m.joinedAt)), { month: "short", year: "numeric" })}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flip-face flip-back absolute inset-0 rounded-3xl bg-linear-to-br from-slate-100 to-slate-300 p-5 text-slate-900 shadow-[0_30px_60px_-20px_rgba(0,0,0,.6)]">
              <div className="flex h-full flex-col justify-between">
                <div className="text-sm">
                  <div className="font-bold">{p.name}</div>
                  <div className="text-slate-700">{p.address}</div>
                  {p.phone && <div className="text-slate-700">{p.phone}</div>}
                </div>
                <div>
                  <Barcode code={m.membershipNo} />
                  <div className="mt-1 font-mono text-xs tracking-[0.3em]">{m.membershipNo}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-slate-500">Tap the card to flip it</p>

        <TiltCard>
          <div className="text-xs uppercase tracking-widest text-cyan-300">Attendance</div>
          <div className="mt-3">
            <TimeClock state={state} actions={actions} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat label="Visits" value={state.attendance.length} />
            <Stat label="This month" value={thisMonth.length} />
            <Stat label="Total time" value={formatDuration(totalMs)} />
          </div>
        </TiltCard>
      </div>

      <div className="min-w-0 space-y-5">
      <TiltCard max={1}>
        <AttendanceCalendar attendance={state.attendance} />
      </TiltCard>
      <TiltCard max={1}>
        <h3 className="text-lg font-bold text-white">Time in / time out log</h3>
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">No visits yet. Press “Time in” when you arrive at the gym.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Time in</th>
                  <th className="py-2 pr-3">Time out</th>
                  <th className="py-2 pr-3">Duration</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 pr-3 text-slate-200">{formatDate(toISODate(new Date(a.timeIn)))}</td>
                    <td className="py-2 pr-3 font-mono text-emerald-200">{formatTime(a.timeIn)}</td>
                    <td className="py-2 pr-3 font-mono text-rose-200">{a.timeOut ? formatTime(a.timeOut) : "—"}</td>
                    <td className="py-2 pr-3 text-slate-300">
                      {formatDuration((a.timeOut ? new Date(a.timeOut).getTime() : now) - new Date(a.timeIn).getTime())}
                      {!a.timeOut && <span className="ml-1 text-emerald-300">(in gym)</span>}
                    </td>
                    <td className="py-2 text-right">
                      <button className="text-xs text-slate-500 hover:text-rose-300" onClick={() => confirm("Delete this visit?") && actions.deleteAttendance(a.id)}>
                        delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TiltCard>
      </div>
    </div>
  );
}
