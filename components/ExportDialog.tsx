"use client";

import { useState } from "react";
import { mealDaysForPlan } from "@/lib/meals";
import type { ExportOptions, Output } from "@/lib/pdf";
import { currentPlan } from "@/lib/store";
import type { AppState, GymPlan } from "@/lib/types";
import { Button, cx, Modal } from "./ui";
import { estimateSeconds } from "./WorkoutPlayer";

export default function ExportDialog({
  state,
  plan,
  open,
  onClose,
  initial,
}: {
  state: AppState;
  plan?: GymPlan;
  open: boolean;
  onClose: () => void;
  initial?: Partial<ExportOptions>;
}) {
  const p = plan ?? currentPlan(state);
  const hasMember = !!state.member;
  const hasMeals = hasMember && state.mealSeed !== undefined;
  const [o, setO] = useState<ExportOptions>({
    details: hasMember,
    progress: false,
    gym: hasMember,
    meals: "none",
    cali: !hasMember && !!state.cali,
    attendance: false,
    ...initial,
  });
  const [busy, setBusy] = useState<Output | null>(null);
  const [err, setErr] = useState("");

  const run = async (out: Output) => {
    setBusy(out);
    setErr("");
    try {
      const { memberPdf } = await import("@/lib/pdf");
      const mealDays = o.meals !== "none" && state.member && p && state.mealSeed !== undefined ? mealDaysForPlan(state.member.profile, state.mealSeed, p) : undefined;
      await memberPdf(state, p, o, { mealDays, minutesFor: estimateSeconds }, out);
    } catch (e) {
      setErr((e as Error).message || "Could not create the PDF");
    } finally {
      setBusy(null);
    }
  };

  const nothing = !o.details && !o.progress && !o.gym && o.meals === "none" && !o.cali && !o.attendance;
  const Row = ({ k, label, sub, disabled }: { k: keyof ExportOptions; label: string; sub: string; disabled?: boolean }) => (
    <label className={cx("flex items-start gap-3 rounded-xl border border-white/10 bg-white/[.03] p-3", disabled ? "opacity-40" : "cursor-pointer hover:bg-white/[.06]")}>
      <input type="checkbox" disabled={disabled} checked={!disabled && !!o[k]} onChange={(e) => setO((s) => ({ ...s, [k]: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-cyan-400" />
      <span>
        <span className="block text-sm font-semibold text-white">{label}</span>
        <span className="block text-xs text-slate-400">{sub}</span>
      </span>
    </label>
  );

  return (
    <Modal open={open} onClose={onClose}>
      <div className="text-xs uppercase tracking-widest text-cyan-300">PDF & print</div>
      <h2 className="mt-1 text-2xl font-black text-white">What should the PDF include?</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Row k="details" label="👤 Member details" sub="Photo, contact, body stats, targets" disabled={!hasMember} />
        <Row k="progress" label="📈 Progress" sub="Every 3-month phase + check-ins" disabled={!hasMember} />
        <Row k="gym" label="📅 Gym schedule" sub={p ? `${p.phaseName} — all ${p.weeks.length} weeks` : "No gym plan"} disabled={!p} />
        <Row k="cali" label="🎖 Military 21" sub={state.cali ? `Round ${state.cali.round} — all 21 days` : "Not started"} disabled={!state.cali} />
        <Row k="attendance" label="🕒 Attendance" sub="Time in / time out log" disabled={!hasMember} />
        <div className={cx("rounded-xl border border-white/10 bg-white/[.03] p-3", !hasMeals && "opacity-40")}>
          <div className="text-sm font-semibold text-white">🥗 Meal plan</div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            {(
              [
                ["none", "No"],
                ["week", "Next 7 days"],
                ["phase", "Whole 3 months"],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                disabled={!hasMeals}
                onClick={() => setO((s) => ({ ...s, meals: v }))}
                className={cx("rounded-lg px-2.5 py-1 font-semibold", o.meals === v && hasMeals ? "bg-emerald-400 text-slate-950" : "bg-white/5 text-slate-300")}
              >
                {l}
              </button>
            ))}
          </div>
          {!hasMeals && <div className="mt-1 text-[11px] text-slate-500">Add a meal plan first (Meal Plan tab)</div>}
        </div>
      </div>
      {o.meals === "phase" && <p className="mt-3 text-xs text-amber-200">The whole 3-month meal plan is long (about 45 pages).</p>}
      {err && <p className="mt-3 text-sm text-rose-300">{err}</p>}
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="ghost" disabled={nothing || !!busy} onClick={() => run("print")}>
          {busy === "print" ? "Preparing…" : "🖨 Print"}
        </Button>
        <Button disabled={nothing || !!busy} onClick={() => run("download")}>
          {busy === "download" ? "Creating PDF…" : "⬇ Download PDF"}
        </Button>
      </div>
    </Modal>
  );
}
