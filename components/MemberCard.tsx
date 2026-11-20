"use client";

import { diffDays, formatDate, today, toISODate } from "@/lib/date";
import { bmi, GOAL_LABEL } from "@/lib/health";
import type { MemberRecord } from "@/lib/types";
import { cx } from "./ui";

/** Futuristic member card. Click opens the member's page. */
export default function MemberCard({ rec, onOpen, className }: { rec: MemberRecord; onOpen?: () => void; className?: string }) {
  const m = rec.member;
  const p = m.profile;
  const plan = rec.plans[rec.plans.length - 1];
  const total = plan ? diffDays(plan.startDate, plan.endDate) : 1;
  const elapsed = plan ? Math.min(total, Math.max(0, diffDays(plan.startDate, today()) + 1)) : 0;
  const inGym = rec.attendance.some((a) => !a.timeOut);
  return (
    <button onClick={onOpen} className={cx("holo-card group block w-full rounded-[24px] p-[1.5px] text-left transition hover:-translate-y-1 hover:scale-[1.01]", className)}>
      <div className="holo-inner relative overflow-hidden rounded-[23px] p-4">
        <span className="corner tl" />
        <span className="corner br" />
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-300/80">
          <span>IronForge · Member</span>
          {inGym ? <span className="text-emerald-300">● in gym</span> : <span className="text-slate-500">{GOAL_LABEL[p.goal]}</span>}
        </div>
        <div className="mt-3 flex items-center gap-4">
          <div className="holo-photo relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl">
            {m.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-black text-cyan-200">{p.name.slice(0, 1).toUpperCase()}</span>
            )}
            <span className="scanline" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-xl font-black uppercase text-white">{p.name}</div>
            <div className="font-mono text-sm tracking-[0.15em] text-cyan-300 [text-shadow:0_0_10px_rgba(34,211,238,.7)]">{m.membershipNo}</div>
            <div className="mt-1 text-xs text-slate-400">
              {p.heightCm} cm · {p.weightKg} kg · BMI {bmi(p).toFixed(1)}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-[10px] uppercase tracking-widest text-slate-500">
            <span>{plan?.phaseName ?? "No plan"}</span>
            <span>since {formatDate(toISODate(new Date(m.joinedAt)), { month: "short", year: "numeric" })}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-linear-to-r from-cyan-400 to-orange-400" style={{ width: `${(elapsed / total) * 100}%` }} />
          </div>
        </div>
        <div className="mt-3 text-center text-[11px] font-semibold uppercase tracking-widest text-cyan-200/70 transition group-hover:text-cyan-100">Tap to open →</div>
      </div>
    </button>
  );
}
