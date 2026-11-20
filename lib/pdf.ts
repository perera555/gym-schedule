"use client";

import { CALI_WEEKS } from "./calisthenics";
import { addDays, diffDays, formatDate, formatDuration, formatTime, toISODate } from "./date";
import { getExercise } from "./exercises";
import { bmi, bmiLabel, GOAL_LABEL, LEVEL_LABEL, nutrition } from "./health";
import { fmt12, type MealDay } from "./meals";
import type { AppState, CaliProgram, GymPlan, Member, PlannedExercise } from "./types";

type Doc = import("jspdf").jsPDF;
type AutoTable = typeof import("jspdf-autotable").default;
export type Output = "download" | "print";

// jsPDF's built-in Helvetica only covers Latin-1, so swap typographic symbols for plain ones.
const clean = (s: string) =>
  s
    .replace(/[·•]/g, "|")
    .replace(/[–—]/g, "-")
    .replace(/×/g, "x")
    .replace(/→/g, "->")
    .replace(/[✓✔]/g, "v")
    .replace(/[^\x00-\xFF]/g, "");

const CYAN: [number, number, number] = [8, 145, 178];
const DARK: [number, number, number] = [11, 19, 36];
const ORANGE: [number, number, number] = [234, 88, 12];
const GREEN: [number, number, number] = [5, 150, 105];
const TABLE = { theme: "grid" as const, styles: { fontSize: 7.5, cellPadding: 1.8, valign: "top" as const, lineColor: [226, 232, 240] as [number, number, number], textColor: [30, 41, 59] as [number, number, number] }, margin: { left: 14, right: 14, top: 16 } };

const lastY = (doc: Doc) => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

function banner(doc: Doc, title: string, subtitle: string, accent = CYAN) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...DARK);
  doc.rect(0, 0, w, 28, "F");
  doc.setFillColor(...accent);
  doc.rect(0, 28, w, 1.6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("IRONFORGE", 14, 13);
  doc.setFontSize(11);
  doc.text(clean(title), 14, 21);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(clean(subtitle), w - 14, 13, { align: "right" });
  doc.text(`Generated ${new Date().toLocaleDateString()}`, w - 14, 21, { align: "right" });
  return 36;
}

function heading(doc: Doc, y: number, text: string, accent = CYAN) {
  if (y > doc.internal.pageSize.getHeight() - 30) {
    doc.addPage();
    y = 16;
  }
  doc.setFillColor(...accent);
  doc.rect(14, y - 4, 2, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text(clean(text), 19, y + 0.8);
  doc.setFont("helvetica", "normal");
  return y + 6;
}

function para(doc: Doc, y: number, text: string) {
  doc.setFontSize(9);
  doc.setTextColor(80, 90, 105);
  const lines = doc.splitTextToSize(clean(text), doc.internal.pageSize.getWidth() - 28);
  doc.text(lines, 14, y);
  return y + lines.length * 4 + 2;
}

function footer(doc: Doc, label: string) {
  const n = doc.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 130, 145);
    doc.text(clean(label), 14, h - 8);
    doc.text(`Page ${i} of ${n}`, w - 14, h - 8, { align: "right" });
  }
}

const exLines = (list: PlannedExercise[]) =>
  list
    .map((e, i) => {
      const ex = getExercise(e.id);
      const sets = e.sets > 1 ? `${e.sets} x ` : "";
      const rest = e.restSec ? `, rest ${e.restSec}s` : "";
      return clean(`${i + 1}. ${ex.name} - ${sets}${e.reps}${rest}${e.note ? ` (${e.note})` : ""}`);
    })
    .join("\n");

// ---------------- sections ----------------

function memberSection(doc: Doc, y: number, m: Member, plan?: GymPlan) {
  const w = doc.internal.pageSize.getWidth();
  const p = m.profile;
  let x = 14;
  if (m.photo) {
    try {
      doc.addImage(m.photo, "JPEG", 14, y, 30, 30);
      doc.setDrawColor(...CYAN);
      doc.setLineWidth(0.6);
      doc.rect(14, y, 30, 30);
      x = 50;
    } catch {}
  }
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(clean(p.name), x, y + 6);
  doc.setFontSize(10);
  doc.setTextColor(...CYAN);
  doc.text(m.membershipNo, x, y + 12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 90, 105);
  doc.setFontSize(9);
  const addr = doc.splitTextToSize(clean([p.address, p.phone].filter(Boolean).join("  |  ")), w - x - 14);
  doc.text(addr, x, y + 18);
  doc.text(`Member since ${formatDate(toISODate(new Date(m.joinedAt)), { day: "numeric", month: "short", year: "numeric" })}`, x, y + 18 + addr.length * 4);

  const b = bmi(p);
  const n = nutrition(p);
  const totalIn = p.heightCm / 2.54;
  const ft = Math.floor(totalIn / 12);
  const inch = Math.round(totalIn - ft * 12);
  const items: [string, string][] = [
    ["Age / Sex", `${p.age} / ${p.sex === "male" ? "Male" : "Female"}`],
    ["Height", `${p.heightCm} cm (${ft}' ${inch}")`],
    ["Weight", `${p.weightKg} kg (${Math.round(p.weightKg * 2.20462)} lb)`],
    ["Target", `${p.targetWeightKg} kg`],
    ["BMI", `${b.toFixed(1)} ${bmiLabel(b).label}`],
    ["Goal", GOAL_LABEL[p.goal]],
    ["Level", LEVEL_LABEL[p.level]],
    ["Days / week", String(p.daysPerWeek)],
    ["Calories / day", `${n.calories} kcal`],
    ["Protein / day", `${n.protein} g`],
    ["Water / day", `${n.waterL} L`],
    ["Current phase", plan ? `Phase ${plan.cycle}` : "-"],
  ];
  let yy = Math.max(y + 34, y + 28 + addr.length * 4);
  const colW = (w - 28) / 4;
  items.forEach(([k, v], i) => {
    const cx = 14 + (i % 4) * colW;
    const cy = yy + Math.floor(i / 4) * 11;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(cx, cy, colW - 2, 9.5, 1.5, 1.5, "F");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(k.toUpperCase(), cx + 2, cy + 3.5);
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "bold");
    doc.text(clean(v), cx + 2, cy + 7.8);
    doc.setFont("helvetica", "normal");
  });
  yy += Math.ceil(items.length / 4) * 11 + 4;
  return yy;
}

function progressSection(doc: Doc, at: AutoTable, y: number, s: AppState) {
  y = heading(doc, y, "Progress every 3 months");
  at(doc, {
    ...TABLE,
    startY: y,
    head: [["Phase", "Dates", "Start -> end weight", "Workouts done", "Gym visits", "Goal"]],
    body: s.plans.map((p, i) => {
      const next = s.plans[i + 1];
      const endW = next ? next.profileSnapshot.weightKg : s.member!.profile.weightKg;
      const training = p.weeks.flatMap((w) => w.days).filter((d) => d.type !== "rest" && diffDays(d.date, p.endDate) > 0);
      const done = training.filter((d) => s.completedDays.includes(d.date)).length;
      const visits = s.attendance.filter((a) => {
        const d = toISODate(new Date(a.timeIn));
        return diffDays(p.startDate, d) >= 0 && diffDays(d, p.endDate) > 0;
      }).length;
      const ch = endW - p.profileSnapshot.weightKg;
      return [
        clean(p.phaseName) + (next ? "" : " (current)"),
        `${formatDate(p.startDate, { day: "numeric", month: "short", year: "2-digit" })} - ${formatDate(p.endDate, { day: "numeric", month: "short", year: "2-digit" })}`,
        `${p.profileSnapshot.weightKg} -> ${endW} kg (${ch > 0 ? "+" : ""}${ch.toFixed(1)})`,
        `${done} / ${training.length}`,
        String(visits),
        GOAL_LABEL[p.profileSnapshot.goal],
      ];
    }),
    headStyles: { fillColor: CYAN },
  });
  y = lastY(doc) + 6;
  y = heading(doc, y, "Check-in history");
  at(doc, {
    ...TABLE,
    startY: y,
    head: [["Date", "Weight", "Change", "Height", "Goal", "Note"]],
    body: s.checkIns.map((c, i) => {
      const d = i ? c.weightKg - s.checkIns[i - 1].weightKg : 0;
      return [formatDate(c.date, { day: "numeric", month: "short", year: "numeric" }), `${c.weightKg} kg`, i ? `${d > 0 ? "+" : ""}${d.toFixed(1)} kg` : "-", `${c.heightCm} cm`, GOAL_LABEL[c.goal], clean(c.note ?? "")];
    }),
    headStyles: { fillColor: CYAN },
  });
  y = lastY(doc) + 6;
  if (s.progress?.length) {
    y = heading(doc, y, "Weekly progress updates");
    at(doc, {
      ...TABLE,
      startY: y,
      head: [["Date", "Weight", "Change", "Waist", "Chest", "Arm", "Hips", "Body fat", "Note"]],
      body: s.progress.map((p, i) => {
        const d = i ? p.weightKg - s.progress![i - 1].weightKg : 0;
        const cm = (v?: number) => (v ? `${v} cm` : "-");
        return [
          formatDate(p.date, { day: "numeric", month: "short", year: "numeric" }),
          `${p.weightKg} kg`,
          i ? `${d > 0 ? "+" : ""}${d.toFixed(1)} kg` : "-",
          cm(p.waistCm),
          cm(p.chestCm),
          cm(p.armCm),
          cm(p.hipsCm),
          p.bodyFatPct ? `${p.bodyFatPct}%` : "-",
          clean(p.note ?? ""),
        ];
      }),
      headStyles: { fillColor: CYAN },
    });
    y = lastY(doc) + 6;
  }
  return y + 2;
}

function gymSection(doc: Doc, at: AutoTable, y: number, plan: GymPlan, completed: string[]) {
  y = heading(doc, y, `3-month gym schedule | ${plan.phaseName}`);
  y = para(doc, y, `${formatDate(plan.startDate, { day: "numeric", month: "long", year: "numeric" })} to ${formatDate(addDays(plan.endDate, -1), { day: "numeric", month: "long", year: "numeric" })}. ${plan.phaseSummary}`);
  for (const w of plan.weeks) {
    const first = w.days[0].date;
    const last = w.days[w.days.length - 1].date;
    at(doc, {
      ...TABLE,
      startY: y,
      head: [[{ content: clean(`Week ${w.index + 1}  |  ${formatDate(first, { day: "numeric", month: "short" })} - ${formatDate(last, { day: "numeric", month: "short" })}  |  ${w.label}`), colSpan: 4 }]],
      body: w.days.map((d) => [
        clean(formatDate(d.date, { weekday: "short", day: "numeric", month: "short" })),
        clean(`${d.title}\n${d.focus}`),
        exLines(d.exercises),
        completed.includes(d.date) ? "DONE" : "[  ]",
      ]),
      headStyles: { fillColor: w.deload ? ORANGE : CYAN, textColor: 255, fontStyle: "bold", fontSize: 8.5 },
      columnStyles: { 0: { cellWidth: 24, fontStyle: "bold" }, 1: { cellWidth: 36 }, 2: { cellWidth: "auto" }, 3: { cellWidth: 13, halign: "center" } },
      didParseCell: (data) => {
        if (data.section === "body" && w.days[data.row.index]?.type === "rest") data.cell.styles.fillColor = [248, 250, 252];
      },
    });
    y = lastY(doc) + 5;
  }
  return y + 3;
}

function mealSection(doc: Doc, at: AutoTable, y: number, days: MealDay[], label: string) {
  y = heading(doc, y, `Meal & water plan | ${label}`, GREEN);
  y = para(doc, y, "Portions are sized to your daily calorie and protein targets. Swap foods for similar ones you like; keep the timing and water schedule.");
  for (const d of days) {
    at(doc, {
      ...TABLE,
      startY: y,
      head: [
        [
          {
            content: clean(`${formatDate(d.date, { weekday: "long", day: "numeric", month: "short" })}  |  ${d.training ? "Training day" : "Rest day"}  |  target ${d.target.kcal} kcal, ${d.target.protein} g protein, ${(d.target.waterMl / 1000).toFixed(1)} L water`),
            colSpan: 4,
          },
        ],
      ],
      body: d.entries.map((e) => [
        fmt12(e.time),
        clean(e.title),
        clean(e.foods ? e.foods.map((f) => `${f.name} ${f.amount}`).join(", ") : (e.detail ?? "")),
        e.kcal ? `${e.kcal} kcal\n${e.protein} g P` : e.waterMl ? `${e.waterMl} ml` : "",
      ]),
      headStyles: { fillColor: d.training ? GREEN : [71, 85, 105], textColor: 255, fontStyle: "bold", fontSize: 8 },
      columnStyles: { 0: { cellWidth: 18, fontStyle: "bold" }, 1: { cellWidth: 52 }, 2: { cellWidth: "auto" }, 3: { cellWidth: 20, halign: "right" } },
      didParseCell: (data) => {
        const e = d.entries[data.row.index];
        if (data.section === "body" && e?.kind === "water") data.cell.styles.textColor = [8, 120, 160];
      },
    });
    y = lastY(doc) + 4;
  }
  return y + 4;
}

function caliSection(doc: Doc, at: AutoTable, y: number, cali: CaliProgram, minutesFor: (ex: PlannedExercise[]) => number) {
  y = heading(doc, y, `Military Calisthenics 21 | Round ${cali.round} | ${LEVEL_LABEL[cali.level]}`, ORANGE);
  y = para(doc, y, `Starts ${formatDate(cali.startDate, { day: "numeric", month: "long", year: "numeric" })}. Every day is a 20-minute session: warm-up, 3-round interval circuit, cool-down. Days 1 and 21 are PT tests.`);
  for (let wk = 0; wk < 3; wk++) {
    const days = cali.days.slice(wk * 7, wk * 7 + 7);
    at(doc, {
      ...TABLE,
      startY: y,
      head: [[{ content: `Week ${wk + 1}  |  ${CALI_WEEKS[wk]}`, colSpan: 5 }]],
      body: days.map((d) => [
        `Day ${d.day}\n${clean(formatDate(d.date, { weekday: "short", day: "numeric", month: "short" }))}`,
        clean(d.title),
        exLines(d.exercises),
        `${Math.round(minutesFor(d.exercises) / 60)} min`,
        cali.completed.includes(d.day) ? "DONE" : "[  ]",
      ]),
      headStyles: { fillColor: ORANGE, textColor: 255, fontStyle: "bold", fontSize: 8.5 },
      columnStyles: { 0: { cellWidth: 22, fontStyle: "bold" }, 1: { cellWidth: 30 }, 2: { cellWidth: "auto" }, 3: { cellWidth: 14, halign: "center" }, 4: { cellWidth: 13, halign: "center" } },
    });
    y = lastY(doc) + 5;
  }
  return y + 3;
}

function attendanceSection(doc: Doc, at: AutoTable, y: number, s: AppState) {
  y = heading(doc, y, "Attendance (time in / time out)");
  const total = s.attendance.reduce((t, a) => t + (a.timeOut ? new Date(a.timeOut).getTime() - new Date(a.timeIn).getTime() : 0), 0);
  y = para(doc, y, `${s.attendance.length} visits, ${formatDuration(total)} in the gym.`);
  at(doc, {
    ...TABLE,
    startY: y,
    head: [["Date", "Time in", "Time out", "Duration"]],
    body: [...s.attendance].reverse().map((a) => [
      formatDate(toISODate(new Date(a.timeIn)), { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
      formatTime(a.timeIn),
      a.timeOut ? formatTime(a.timeOut) : "-",
      a.timeOut ? formatDuration(new Date(a.timeOut).getTime() - new Date(a.timeIn).getTime()) : "in gym",
    ]),
    headStyles: { fillColor: CYAN },
  });
  return lastY(doc) + 8;
}

// ---------------- public API ----------------

export interface ExportOptions {
  details: boolean;
  progress: boolean;
  gym: boolean;
  meals: "none" | "week" | "phase";
  cali: boolean;
  attendance: boolean;
}

/** One PDF containing whichever sections the user picked. */
export async function memberPdf(
  s: AppState,
  plan: GymPlan | undefined,
  opts: ExportOptions,
  helpers: { mealDays?: MealDay[]; minutesFor: (ex: PlannedExercise[]) => number },
  out: Output = "download",
) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const m = s.member;
  const parts = [opts.gym && "Gym schedule", opts.meals !== "none" && "Meal plan", opts.cali && "Military 21", opts.progress && "Progress"].filter(Boolean).join(" + ");
  let y = banner(doc, m ? `${m.profile.name} | ${parts || "Member report"}` : `Military Calisthenics 21`, m ? m.membershipNo : "Guest", opts.gym || !opts.cali ? CYAN : ORANGE);

  const section = (fn: () => number, newPage: boolean) => {
    if (newPage && y > 40) {
      doc.addPage();
      y = 16;
    }
    y = fn();
  };

  if (m && opts.details) section(() => memberSection(doc, y, m, plan), false);
  if (m && opts.progress) section(() => progressSection(doc, autoTable, y, s), false);
  if (opts.gym && plan) section(() => gymSection(doc, autoTable, y, plan, s.completedDays), true);
  if (opts.meals !== "none" && helpers.mealDays?.length) {
    const days = opts.meals === "week" ? helpers.mealDays.slice(0, 7) : helpers.mealDays;
    section(() => mealSection(doc, autoTable, y, days, opts.meals === "week" ? "next 7 days" : "whole 3-month phase"), true);
  }
  if (opts.cali && s.cali) section(() => caliSection(doc, autoTable, y, s.cali!, helpers.minutesFor), true);
  if (m && opts.attendance) section(() => attendanceSection(doc, autoTable, y, s), true);

  footer(doc, m ? `${m.profile.name}  |  ${m.membershipNo}` : "IronForge | Military Calisthenics 21");
  const slug = (m?.profile.name ?? "guest").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  finish(doc, `ironforge-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`, out);
}

function finish(doc: Doc, filename: string, out: Output) {
  if (out === "print") {
    doc.autoPrint();
    const url = doc.output("bloburl") as unknown as string;
    const win = window.open(url, "_blank");
    if (!win) doc.save(filename); // pop-up blocked: download instead
  } else {
    doc.save(filename);
  }
}

/** Members register for the admin. */
export async function membersPdf(rows: { name: string; no: string; phone: string; phase: string; weight: string; visits: number; joined: string }[], out: Output = "download") {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const y = banner(doc, "Members register", `${rows.length} members`);
  autoTable(doc, {
    ...TABLE,
    theme: "striped",
    startY: y,
    head: [["#", "Name", "Membership No.", "Phone", "Current phase", "Weight", "Visits", "Joined"]],
    body: rows.map((r, i) => [i + 1, clean(r.name), r.no, clean(r.phone), clean(r.phase), r.weight, r.visits, clean(r.joined)]),
    headStyles: { fillColor: CYAN },
  });
  footer(doc, "IronForge members register");
  finish(doc, "ironforge-members.pdf", out);
}
