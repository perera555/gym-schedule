"use client";

import { useState } from "react";
import { diffDays, formatDate, today, toISODate } from "@/lib/date";
import type { Actions } from "@/lib/store";
import type { Member, ProgressLog } from "@/lib/types";
import { Badge, Button, cx, Field, inputCls, Modal } from "./ui";
import { kgToLb, Segmented, useUnits } from "./UnitInputs";

type Draft = Omit<ProgressLog, "id" | "by"> & { id?: string };

/** Days since the last weekly update (or since joining / last check-in). */
export function daysSinceUpdate(member: Member, progress: ProgressLog[] = [], checkIns: { date: string }[] = []) {
  const dates = [toISODate(new Date(member.joinedAt)), ...checkIns.map((c) => c.date), ...progress.map((p) => p.date)].sort();
  return diffDays(dates[dates.length - 1], today());
}

export function WeeklyProgressModal({
  memberId,
  member,
  initial,
  by,
  actions,
  onClose,
}: {
  memberId: string;
  member: Member;
  initial?: ProgressLog;
  by: "member" | "admin";
  actions: Actions;
  onClose: () => void;
}) {
  const [units, setUnits] = useUnits();
  const lb = units.w === "lb";
  const [d, setD] = useState<Draft>(initial ?? { date: today(), weightKg: member.profile.weightKg });
  const [wText, setWText] = useState(String(lb ? kgToLb(d.weightKg) : d.weightKg));
  const num = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => setD((s) => ({ ...s, [k]: e.target.value === "" ? undefined : Number(e.target.value) }));
  const change = d.weightKg - member.profile.weightKg;

  return (
    <Modal open onClose={onClose}>
      <div className="text-xs uppercase tracking-widest text-cyan-300">
        Weekly progress · {member.profile.name} · {member.membershipNo}
      </div>
      <h2 className="mt-1 text-2xl font-black text-white">{initial ? "Edit weekly update" : "Add weekly update"}</h2>
      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!d.weightKg) return;
          actions.saveProgress(memberId, { ...d, note: d.note?.trim() || undefined, by: initial?.by ?? by });
          onClose();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date">
            <input type="date" required max={today()} className={inputCls} value={d.date} onChange={(e) => setD((s) => ({ ...s, date: e.target.value }))} />
          </Field>
          <Field
            label={`Weight (${units.w})`}
            hint={
              !initial && change !== 0 ? (
                <span className={change > 0 ? "text-orange-300" : "text-emerald-300"}>
                  {change > 0 ? "+" : ""}
                  {lb ? `${kgToLb(change)} lb` : `${change.toFixed(1)} kg`} vs current {lb ? `${kgToLb(member.profile.weightKg)} lb` : `${member.profile.weightKg} kg`}
                </span>
              ) : undefined
            }
          >
            <div className="flex gap-2">
              <input
                required
                type="number"
                step="0.1"
                min={lb ? 66 : 30}
                max={lb ? 660 : 300}
                className={inputCls}
                value={wText}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => {
                  setWText(e.target.value);
                  const v = Number(e.target.value) || 0;
                  setD((s) => ({ ...s, weightKg: Math.round((lb ? v / 2.20462 : v) * 10) / 10 }));
                }}
              />
              <Segmented
                value={units.w}
                options={[
                  ["kg", "kg"],
                  ["lb", "lb"],
                ]}
                onChange={(w) => {
                  setUnits({ w });
                  setWText(String(w === "lb" ? kgToLb(d.weightKg) : d.weightKg));
                }}
              />
            </div>
          </Field>
        </div>

        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">Body measurements (cm, optional)</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(
              [
                ["waistCm", "Waist"],
                ["chestCm", "Chest"],
                ["armCm", "Arm"],
                ["hipsCm", "Hips"],
                ["bodyFatPct", "Body fat %"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="block">
                <span className="mb-1 block text-[11px] text-slate-400">{label}</span>
                <input type="number" step="0.1" min={0} className={inputCls} value={d[k] ?? ""} onChange={num(k)} />
              </label>
            ))}
          </div>
        </div>

        <Field label="How was the week?">
          <div className="flex flex-wrap gap-1.5">
            {(["😫", "😕", "😐", "🙂", "💪"] as const).map((e, i) => (
              <button
                type="button"
                key={e}
                onClick={() => setD((s) => ({ ...s, energy: (i + 1) as ProgressLog["energy"] }))}
                className={cx("rounded-xl border px-3 py-2 text-xl", d.energy === i + 1 ? "border-cyan-300 bg-cyan-400/20" : "border-white/10 bg-white/5")}
              >
                {e}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Notes">
          <textarea rows={2} className={inputCls} value={d.note ?? ""} onChange={(e) => setD((s) => ({ ...s, note: e.target.value }))} placeholder="Workouts missed, diet, sleep, injuries, wins…" />
        </Field>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">💾 Save update</Button>
        </div>
      </form>
    </Modal>
  );
}

/** Weekly update reminder + history table with edit / delete. */
export function WeeklyProgressPanel({
  memberId,
  member,
  progress = [],
  checkIns = [],
  actions,
  by,
}: {
  memberId: string;
  member: Member;
  progress?: ProgressLog[];
  checkIns?: { date: string }[];
  actions: Actions;
  by: "member" | "admin";
}) {
  const [editing, setEditing] = useState<ProgressLog | "new" | null>(null);
  const since = daysSinceUpdate(member, progress, checkIns);
  const due = since >= 7;
  const rows = [...progress].reverse();
  const first = progress[0];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">Weekly progress updates</h3>
          <div className="text-xs text-slate-400">Add one every week — weight and measurements. The newest weight becomes your current weight.</div>
        </div>
        <Button variant={due ? "accent" : "primary"} onClick={() => setEditing("new")}>
          ＋ Add weekly update
        </Button>
      </div>

      {due && (
        <div className="mt-3 rounded-2xl border border-orange-300/40 bg-orange-400/10 px-4 py-2.5 text-sm text-orange-100">
          ⏰ Weekly update due — last update was {since} days ago.
        </div>
      )}

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No weekly updates yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-2 pr-3">Week of</th>
                <th className="py-2 pr-3">Weight</th>
                <th className="py-2 pr-3">Change</th>
                <th className="py-2 pr-3">Waist / Chest / Arm / Hips</th>
                <th className="py-2 pr-3">Feel</th>
                <th className="py-2 pr-3">Note</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((p, i) => {
                const prev = rows[i + 1];
                const ch = prev ? p.weightKg - prev.weightKg : 0;
                return (
                  <tr key={p.id}>
                    <td className="py-2 pr-3 text-slate-200">
                      {formatDate(p.date, { day: "numeric", month: "short", year: "numeric" })}
                      {p.by === "admin" && (
                        <span className="ml-2">
                          <Badge tone="slate">admin</Badge>
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 font-semibold text-white">{p.weightKg} kg</td>
                    <td className={cx("py-2 pr-3", ch > 0 ? "text-orange-300" : ch < 0 ? "text-emerald-300" : "text-slate-500")}>{prev ? `${ch > 0 ? "+" : ""}${ch.toFixed(1)} kg` : "—"}</td>
                    <td className="py-2 pr-3 text-slate-300">{[p.waistCm, p.chestCm, p.armCm, p.hipsCm].map((v) => v ?? "–").join(" / ")}</td>
                    <td className="py-2 pr-3">{p.energy ? ["😫", "😕", "😐", "🙂", "💪"][p.energy - 1] : ""}</td>
                    <td className="max-w-[220px] truncate py-2 pr-3 text-slate-400" title={p.note}>
                      {p.note}
                    </td>
                    <td className="whitespace-nowrap py-2 text-right">
                      <button className="mr-2 text-xs text-slate-300 hover:text-white" onClick={() => setEditing(p)}>
                        edit
                      </button>
                      <button className="text-xs text-slate-500 hover:text-rose-300" onClick={() => confirm("Delete this weekly update?") && actions.deleteProgress(memberId, p.id)}>
                        delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {first && rows.length > 1 && (
            <div className="mt-3 text-sm text-slate-300">
              Since {formatDate(first.date, { day: "numeric", month: "short" })}:{" "}
              <b className={rows[0].weightKg - first.weightKg > 0 ? "text-orange-300" : "text-emerald-300"}>
                {rows[0].weightKg - first.weightKg > 0 ? "+" : ""}
                {(rows[0].weightKg - first.weightKg).toFixed(1)} kg
              </b>
              {first.waistCm && rows[0].waistCm ? (
                <>
                  {" "}
                  · waist {rows[0].waistCm - first.waistCm > 0 ? "+" : ""}
                  {(rows[0].waistCm - first.waistCm).toFixed(1)} cm
                </>
              ) : null}
            </div>
          )}
        </div>
      )}

      {editing && (
        <WeeklyProgressModal memberId={memberId} member={member} initial={editing === "new" ? undefined : editing} by={by} actions={actions} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
