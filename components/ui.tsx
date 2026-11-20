"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/** Glass card that tilts toward the pointer in 3D. */
export function TiltCard({ children, className, max = 6 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el || e.pointerType !== "mouse") return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(1000px) rotateX(${-y * max}deg) rotateY(${x * max}deg) translateZ(0)`;
        el.style.setProperty("--mx", `${(x + 0.5) * 100}%`);
        el.style.setProperty("--my", `${(y + 0.5) * 100}%`);
      }}
      onPointerLeave={() => {
        if (ref.current) ref.current.style.transform = "";
      }}
      className={cx("glass tilt rounded-3xl p-5", className)}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  className,
  disabled,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "accent";
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "btn3d inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
        variant === "primary" && "bg-linear-to-b from-cyan-300 to-cyan-500 text-slate-950 shadow-[0_6px_0_#0e7490,0_12px_24px_-6px_rgba(34,211,238,.6)]",
        variant === "accent" && "bg-linear-to-b from-orange-300 to-orange-500 text-slate-950 shadow-[0_6px_0_#c2410c,0_12px_24px_-6px_rgba(249,115,22,.6)]",
        variant === "danger" && "bg-linear-to-b from-rose-400 to-rose-600 text-white shadow-[0_6px_0_#9f1239]",
        variant === "ghost" && "border border-white/15 bg-white/5 text-slate-100 shadow-[0_4px_0_rgba(255,255,255,.08)] hover:bg-white/10",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Badge({ children, tone = "cyan" }: { children: ReactNode; tone?: "cyan" | "orange" | "green" | "slate" | "rose" }) {
  const tones = {
    cyan: "bg-cyan-400/15 text-cyan-200 ring-cyan-300/30",
    orange: "bg-orange-400/15 text-orange-200 ring-orange-300/30",
    green: "bg-emerald-400/15 text-emerald-200 ring-emerald-300/30",
    slate: "bg-white/5 text-slate-300 ring-white/15",
    rose: "bg-rose-400/15 text-rose-200 ring-rose-300/30",
  };
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1", tones[tone])}>{children}</span>;
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-3">
      <div className="text-[11px] uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function Modal({ open, onClose, children, wide }: { open: boolean; onClose?: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open || !onClose) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={cx("modal-in glass max-h-[95vh] w-full overflow-y-auto rounded-t-3xl p-5 sm:rounded-3xl", wide ? "max-w-5xl" : "max-w-2xl")}
      >
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 shadow-inner outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20";
