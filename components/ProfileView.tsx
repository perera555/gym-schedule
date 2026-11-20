"use client";

import { useState } from "react";
import { formatDate } from "@/lib/date";
import { bmi, bmiLabel, GOAL_LABEL, LEVEL_LABEL } from "@/lib/health";
import type { Actions } from "@/lib/store";
import type { AppState, MemberRecord } from "@/lib/types";
import EditMemberModal from "./EditMemberModal";
import { Button, Stat, TiltCard } from "./ui";

export function WeightChart({ points, target }: { points: { date: string; w: number }[]; target: number }) {
  if (points.length < 2) return <p className="text-sm text-slate-400">Your weight trend appears after the first 3-month check-in.</p>;
  const W = 600;
  const H = 180;
  const ws = [...points.map((p) => p.w), target];
  const min = Math.min(...ws) - 2;
  const max = Math.max(...ws) + 2;
  const x = (i: number) => 30 + (i / (points.length - 1)) * (W - 60);
  const y = (w: number) => H - 25 - ((w - min) / (max - min)) * (H - 50);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.w)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="wl" x1="0" x2="1">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <line x1={20} x2={W - 20} y1={y(target)} y2={y(target)} stroke="#34d399" strokeDasharray="5 5" strokeOpacity={0.6} />
      <text x={W - 20} y={y(target) - 6} textAnchor="end" fill="#34d399" fontSize="11">
        target {target} kg
      </text>
      <path d={path} fill="none" stroke="url(#wl)" strokeWidth={3} strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.w)} r={5} fill="#0b1324" stroke="#22d3ee" strokeWidth={2} />
          <text x={x(i)} y={y(p.w) - 10} textAnchor="middle" fill="#e2e8f0" fontSize="11">
            {p.w}
          </text>
          <text x={x(i)} y={H - 6} textAnchor="middle" fill="#94a3b8" fontSize="10">
            {formatDate(p.date, { month: "short", year: "2-digit" })}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function ProfileView({ state, actions, memberId }: { state: AppState; actions: Actions; memberId: string }) {
  const [editing, setEditing] = useState(false);
  const p = state.member!.profile;
  const b = bmi(p);
  const bl = bmiLabel(b);
  const rec: MemberRecord | null = state.member
    ? { id: memberId, member: state.member, checkIns: state.checkIns, plans: state.plans, completedDays: state.completedDays, attendance: state.attendance, cali: state.cali, mealSeed: state.mealSeed, updatedAt: "" }
    : null;

  return (
    <div className="space-y-5">
      <TiltCard max={2}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-cyan-300">Member profile</div>
            <h2 className="text-2xl font-black text-white">{p.name}</h2>
            <p className="text-sm text-slate-400">{p.address}</p>
            {p.phone && <p className="text-sm text-slate-400">{p.phone}</p>}
          </div>
          <Button variant="ghost" onClick={() => setEditing(true)}>
            ✎ Edit / update details
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          <Stat label="Sex" value={<span className="capitalize">{p.sex}</span>} />
          <Stat label="Age" value={p.age} />
          <Stat label="Height" value={`${p.heightCm} cm`} />
          <Stat label="Weight" value={`${p.weightKg} kg`} />
          <Stat label="Target" value={`${p.targetWeightKg} kg`} sub={`${(p.targetWeightKg - p.weightKg > 0 ? "+" : "") + (p.targetWeightKg - p.weightKg).toFixed(1)} kg`} />
          <Stat label="BMI" value={b.toFixed(1)} sub={<span className={bl.color}>{bl.label}</span>} />
          <Stat label="Goal" value={<span className="text-base">{GOAL_LABEL[p.goal]}</span>} />
          <Stat label="Level" value={<span className="text-base">{LEVEL_LABEL[p.level]}</span>} sub={`${p.daysPerWeek} days/week`} />
        </div>
      </TiltCard>

      <TiltCard max={2}>
        <h3 className="text-lg font-bold text-white">3-month check-ins</h3>
        <div className="mt-3">
          <WeightChart points={state.checkIns.map((c) => ({ date: c.date, w: c.weightKg }))} target={p.targetWeightKg} />
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Weight</th>
                <th className="py-2 pr-3">Change</th>
                <th className="py-2 pr-3">Goal</th>
                <th className="py-2">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {state.checkIns.map((c, i) => {
                const d = i ? c.weightKg - state.checkIns[i - 1].weightKg : 0;
                return (
                  <tr key={i}>
                    <td className="py-2 pr-3 text-slate-200">{formatDate(c.date, { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td className="py-2 pr-3 text-white">{c.weightKg} kg</td>
                    <td className={`py-2 pr-3 ${d > 0 ? "text-orange-300" : d < 0 ? "text-emerald-300" : "text-slate-500"}`}>
                      {i ? `${d > 0 ? "+" : ""}${d.toFixed(1)} kg` : "—"}
                    </td>
                    <td className="py-2 pr-3 text-slate-300">{GOAL_LABEL[c.goal]}</td>
                    <td className="py-2 text-slate-400">{c.note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </TiltCard>

      <div className="flex justify-end">
        <Button
          variant="danger"
          onClick={() =>
            confirm(`Delete member ${p.name} (${state.member!.membershipNo}) with all plans, meals and attendance? This can't be undone.`) && actions.deleteMember(memberId)
          }
        >
          🗑 Delete member
        </Button>
      </div>

      {editing && rec && <EditMemberModal rec={rec} actions={actions} onClose={() => setEditing(false)} />}
    </div>
  );
}
