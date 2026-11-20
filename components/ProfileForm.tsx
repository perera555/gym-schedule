"use client";

import { useState, type FormEvent } from "react";
import { bmi, bmiLabel, GOAL_LABEL, LEVEL_LABEL } from "@/lib/health";
import type { Goal, Level, Profile, Sex } from "@/lib/types";
import { Button, cx, Field, inputCls } from "./ui";
import { HeightInput, heightHint, kgToLb, Segmented, useUnits, WeightInput, weightHint } from "./UnitInputs";

const DEFAULT: Profile = {
  name: "",
  address: "",
  phone: "",
  age: 25,
  sex: "male",
  heightCm: 170,
  weightKg: 70,
  targetWeightKg: 70,
  goal: "general",
  level: "beginner",
  daysPerWeek: 4,
};

export default function ProfileForm({
  initial,
  mode,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial?: Profile;
  mode: "register" | "checkin" | "edit";
  onSubmit: (p: Profile, note: string) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [p, setP] = useState<Profile>(initial ?? DEFAULT);
  const [note, setNote] = useState("");
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((s) => ({ ...s, [k]: v }));
  const num = (k: "age" | "heightCm" | "weightKg" | "targetWeightKg") => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(k, e.target.value === "" ? 0 : Number(e.target.value));

  const [units, setUnits] = useUnits();
  const b = bmi(p);
  const bl = bmiLabel(b);
  const prevW = initial?.weightKg;
  const delta = prevW ? p.weightKg - prevW : 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ ...p, name: p.name.trim(), address: p.address.trim(), phone: p.phone.trim() }, note.trim());
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {mode !== "checkin" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input required className={inputCls} value={p.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Kasun Perera" />
          </Field>
          <Field label="Phone">
            <input className={inputCls} value={p.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+94 7X XXX XXXX" inputMode="tel" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address">
              <textarea required rows={2} className={inputCls} value={p.address} onChange={(e) => set("address", e.target.value)} placeholder="Street, city" />
            </Field>
          </div>
          <Field label="Age">
            <input required type="number" min={12} max={90} className={inputCls} value={p.age || ""} onChange={num("age")} />
          </Field>
        </div>
      )}

      {mode !== "checkin" && (
        <Field label="Sex">
          <div className="grid grid-cols-2 gap-2">
            {(["male", "female"] as Sex[]).map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => set("sex", s)}
                className={cx(
                  "btn3d rounded-xl border px-4 py-2.5 text-sm font-semibold capitalize transition",
                  p.sex === s ? "border-cyan-300/60 bg-cyan-400/15 text-cyan-100 shadow-[0_4px_0_#0e7490]" : "border-white/10 bg-white/5 text-slate-300 shadow-[0_4px_0_rgba(255,255,255,.06)]",
                )}
              >
                {s === "male" ? "♂ Male" : "♀ Female"}
              </button>
            ))}
          </div>
        </Field>
      )}

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <span className="font-semibold uppercase tracking-wider text-slate-300">Units</span>
        <Segmented value={units.h} options={[["cm", "cm"], ["ft", "ft · in"]]} onChange={(h) => setUnits({ h })} />
        <Segmented value={units.w} options={[["kg", "kg"], ["lb", "lb"]]} onChange={(w) => setUnits({ w })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={`Height (${units.h === "cm" ? "cm" : "ft · in"})`} hint={heightHint(p.heightCm, units.h)}>
          <HeightInput key={units.h} cm={p.heightCm} unit={units.h} onChange={(v) => set("heightCm", v)} />
        </Field>
        <Field
          label={`${mode === "checkin" ? "Current weight" : "Weight"} (${units.w})`}
          hint={
            mode === "checkin" && prevW ? (
              <span className={delta > 0 ? "text-orange-300" : delta < 0 ? "text-emerald-300" : ""}>
                {delta === 0
                  ? `No change · ${weightHint(p.weightKg, units.w)}`
                  : `${delta > 0 ? "Gained" : "Lost"} ${units.w === "kg" ? `${Math.abs(delta).toFixed(1)} kg` : `${kgToLb(Math.abs(delta))} lb`} since last check-in`}
              </span>
            ) : (
              weightHint(p.weightKg, units.w)
            )
          }
        >
          <WeightInput key={units.w} kg={p.weightKg} unit={units.w} onChange={(v) => set("weightKg", v)} />
        </Field>
        <Field label={`Target weight (${units.w})`} hint={weightHint(p.targetWeightKg, units.w)}>
          <WeightInput key={units.w} kg={p.targetWeightKg} unit={units.w} onChange={(v) => set("targetWeightKg", v)} />
        </Field>
      </div>

      <BmiBox heightCm={p.heightCm} weightKg={p.weightKg} value={b} label={bl.label} color={bl.color} />

      <Field label="Main goal">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(GOAL_LABEL) as Goal[]).map((g) => (
            <button
              type="button"
              key={g}
              onClick={() => set("goal", g)}
              className={cx(
                "btn3d rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                p.goal === g ? "border-orange-300/60 bg-orange-400/15 text-orange-100 shadow-[0_4px_0_#c2410c]" : "border-white/10 bg-white/5 text-slate-300 shadow-[0_4px_0_rgba(255,255,255,.06)]",
              )}
            >
              {GOAL_LABEL[g]}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Experience">
          <select className={inputCls} value={p.level} onChange={(e) => set("level", e.target.value as Level)}>
            {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABEL[l]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Gym days per week">
          <select className={inputCls} value={p.daysPerWeek} onChange={(e) => set("daysPerWeek", Number(e.target.value) as Profile["daysPerWeek"])}>
            {[3, 4, 5, 6].map((d) => (
              <option key={d} value={d}>
                {d} days
              </option>
            ))}
          </select>
        </Field>
      </div>

      {mode === "checkin" && (
        <Field label="How did the last 3 months go? (optional)">
          <textarea rows={2} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Injuries, wins, what to change…" />
        </Field>
      )}

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant={mode === "checkin" ? "accent" : "primary"}>
          {submitLabel ?? (mode === "register" ? "Create membership & 3-month plan" : mode === "checkin" ? "Save & generate next phase" : "Save")}
        </Button>
      </div>
    </form>
  );
}

const BMI_SCALE = [
  { max: 18.5, label: "Underweight", range: "< 18.5", cls: "bg-sky-400" },
  { max: 25, label: "Healthy", range: "18.5 – 24.9", cls: "bg-emerald-400" },
  { max: 30, label: "Overweight", range: "25 – 29.9", cls: "bg-amber-400" },
  { max: 99, label: "Obese", range: "30 +", cls: "bg-rose-400" },
];

/** BMI result with an expandable "how it's calculated" explanation using the member's own numbers. */
export function BmiBox({ heightCm, weightKg, value, label, color }: { heightCm: number; weightKg: number; value: number; label: string; color: string }) {
  const [open, setOpen] = useState(false);
  const m = heightCm / 100;
  // marker position on a 15–35 BMI scale
  const pos = Math.max(0, Math.min(100, ((value - 15) / 20) * 100));
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-slate-400">BMI</span>
        <span className="text-lg font-bold text-white">{value ? value.toFixed(1) : "—"}</span>
        {value > 0 && <span className={color}>{label}</span>}
        <button type="button" onClick={() => setOpen((o) => !o)} className="ml-auto text-xs text-cyan-300 hover:text-cyan-200">
          {open ? "Hide" : "ⓘ How is BMI calculated?"}
        </button>
      </div>
      {value > 0 && (
        <div className="relative mt-3">
          <div className="flex h-2 overflow-hidden rounded-full">
            <div className="w-[17.5%] bg-sky-400/70" />
            <div className="w-[32.5%] bg-emerald-400/70" />
            <div className="w-[25%] bg-amber-400/70" />
            <div className="flex-1 bg-rose-400/70" />
          </div>
          <div className="absolute -top-1 h-4 w-1 -translate-x-1/2 rounded bg-white shadow-[0_0_8px_white]" style={{ left: `${pos}%` }} />
        </div>
      )}
      {open && (
        <div className="mt-4 space-y-3 text-slate-300">
          <div className="rounded-xl bg-black/30 p-3 font-mono text-xs leading-relaxed">
            <div className="text-cyan-200">BMI = weight (kg) ÷ height (m)²</div>
            {value > 0 && (
              <>
                <div className="mt-2">height = {heightCm} cm = {m.toFixed(2)} m</div>
                <div>
                  height² = {m.toFixed(2)} × {m.toFixed(2)} = {(m * m).toFixed(2)}
                </div>
                <div>
                  BMI = {weightKg} ÷ {(m * m).toFixed(2)} = <span className="font-bold text-white">{value.toFixed(1)}</span>
                </div>
              </>
            )}
            <div className="mt-2 text-slate-500">In pounds &amp; inches: BMI = 703 × weight (lb) ÷ height (in)²</div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {BMI_SCALE.map((s) => (
              <div key={s.label} className={cx("rounded-lg border px-2 py-1.5 text-xs", label === s.label ? "border-white/40 bg-white/10" : "border-white/10")}>
                <span className={cx("mr-1.5 inline-block h-2 w-2 rounded-full", s.cls)} />
                <span className="font-semibold text-white">{s.label}</span>
                <div className="text-slate-400">{s.range}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            How to measure: weigh yourself in the morning without shoes, and measure height standing straight against a wall. BMI is a quick screening number; it doesn&apos;t
            separate muscle from fat, so muscular people can read “overweight” while being lean.
          </p>
        </div>
      )}
    </div>
  );
}
