"use client";

import { useEffect, useState } from "react";
import { cx, inputCls } from "./ui";

export type HeightUnit = "cm" | "ft";
export type WeightUnit = "kg" | "lb";

const LB = 2.20462;
const r1 = (n: number) => Math.round(n * 10) / 10;

export const cmToFtIn = (cm: number) => {
  const totalIn = cm / 2.54;
  let ft = Math.floor(totalIn / 12);
  let inch = Math.round(totalIn - ft * 12);
  if (inch === 12) {
    ft += 1;
    inch = 0;
  }
  return { ft, inch };
};
export const kgToLb = (kg: number) => r1(kg * LB);

const PREF = "ironforge-units";
export function useUnits() {
  const [units, setUnits] = useState<{ h: HeightUnit; w: WeightUnit }>({ h: "cm", w: "kg" });
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(PREF) || "null");
      if (v?.h && v?.w) setUnits(v);
    } catch {}
  }, []);
  const update = (u: Partial<{ h: HeightUnit; w: WeightUnit }>) =>
    setUnits((s) => {
      const n = { ...s, ...u };
      try {
        localStorage.setItem(PREF, JSON.stringify(n));
      } catch {}
      return n;
    });
  return [units, update] as const;
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-white/10 bg-slate-950/60 text-xs font-semibold">
      {options.map(([v, label]) => (
        <button type="button" key={v} onClick={() => onChange(v)} className={cx("px-2.5 py-1 transition", value === v ? "bg-cyan-400 text-slate-950" : "text-slate-400 hover:text-white")}>
          {label}
        </button>
      ))}
    </div>
  );
}

/** Height input that edits centimetres but can show feet + inches. */
export function HeightInput({ cm, unit, onChange }: { cm: number; unit: HeightUnit; onChange: (cm: number) => void }) {
  const init = cmToFtIn(cm || 0);
  const [ft, setFt] = useState(cm ? String(init.ft) : "");
  const [inch, setInch] = useState(cm ? String(init.inch) : "");
  if (unit === "cm") {
    return (
      <input
        required
        type="number"
        min={100}
        max={250}
        step="0.1"
        className={inputCls}
        onFocus={(e) => e.currentTarget.select()}
        value={cm || ""}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
    );
  }
  const push = (f: string, i: string) => onChange(r1(((Number(f) || 0) * 12 + (Number(i) || 0)) * 2.54));
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="relative">
        <input
          required
          type="number"
          min={3}
          max={8}
          className={cx(inputCls, "pr-8")}
          onFocus={(e) => e.currentTarget.select()}
          value={ft}
          onChange={(e) => {
            setFt(e.target.value);
            push(e.target.value, inch);
          }}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">ft</span>
      </div>
      <div className="relative">
        <input
          type="number"
          min={0}
          max={11.9}
          step="0.5"
          className={cx(inputCls, "pr-8")}
          onFocus={(e) => e.currentTarget.select()}
          value={inch}
          onChange={(e) => {
            setInch(e.target.value);
            push(ft, e.target.value);
          }}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">in</span>
      </div>
    </div>
  );
}

/** Weight input that edits kilograms but can show pounds. */
export function WeightInput({ kg, unit, onChange }: { kg: number; unit: WeightUnit; onChange: (kg: number) => void }) {
  const [lb, setLb] = useState(kg ? String(kgToLb(kg)) : "");
  if (unit === "kg") {
    return (
      <input
        required
        type="number"
        min={30}
        max={300}
        step="0.1"
        className={inputCls}
        onFocus={(e) => e.currentTarget.select()}
        value={kg || ""}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
    );
  }
  return (
    <div className="relative">
      <input
        required
        type="number"
        min={66}
        max={660}
        step="0.1"
        className={cx(inputCls, "pr-9")}
        onFocus={(e) => e.currentTarget.select()}
        value={lb}
        onChange={(e) => {
          setLb(e.target.value);
          onChange(e.target.value === "" ? 0 : r1(Number(e.target.value) / LB));
        }}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">lb</span>
    </div>
  );
}

export function heightHint(cm: number, unit: HeightUnit) {
  if (!cm) return "";
  const { ft, inch } = cmToFtIn(cm);
  return unit === "cm" ? `= ${ft} ft ${inch} in` : `= ${cm} cm`;
}
export function weightHint(kg: number, unit: WeightUnit) {
  if (!kg) return "";
  return unit === "kg" ? `= ${kgToLb(kg)} lb` : `= ${kg} kg`;
}
