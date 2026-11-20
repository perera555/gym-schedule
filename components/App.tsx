"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { phaseFor, PHASES } from "@/lib/gymPlan";
import { currentPlan, needsCheckIn, useAppState } from "@/lib/store";
import type { PlannedExercise, Profile } from "@/lib/types";
import AdminView from "./AdminView";
import CaliView from "./CaliView";
import ExportDialog from "./ExportDialog";
import GymPlanView from "./GymPlanView";
import InstallApp from "./InstallApp";
import Mannequin3D from "./Mannequin3D";
import MealPlanView from "./MealPlanView";
import MemberCard from "./MemberCard";
import MembershipView, { TimeClock } from "./MembershipView";
import ProfileForm from "./ProfileForm";
import ProfileView from "./ProfileView";
import ProgressView, { PhotoPicker } from "./ProgressView";
import TodayView from "./TodayView";
import { Badge, Button, cx, inputCls, Modal, TiltCard } from "./ui";
import WorkoutPlayer, { ExerciseDemo } from "./WorkoutPlayer";

const TABS = [
  { id: "today", label: "Today", icon: "⚡" },
  { id: "progress", label: "Progress", icon: "📈" },
  { id: "plan", label: "Gym Schedule", icon: "📅" },
  { id: "meals", label: "Meal Plan", icon: "🥗" },
  { id: "cali", label: "Military 21", icon: "🎖" },
  { id: "member", label: "Attendance", icon: "🪪" },
  { id: "profile", label: "Details", icon: "👤" },
];

type PlayerState = { title: string; exercises: PlannedExercise[]; onDone: () => void } | null;

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-linear-to-br from-cyan-300 to-indigo-600 text-xl font-black text-slate-950 shadow-[0_5px_0_#3730a3,0_10px_25px_-5px_rgba(34,211,238,.6)]">
        I
      </div>
      <div className="hidden text-xl font-black tracking-[0.2em] text-white text-3d sm:block">IRONFORGE</div>
    </div>
  );
}

const linkBtn =
  "btn3d inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 shadow-[0_4px_0_rgba(255,255,255,.08)] hover:bg-white/10";

function HomeButton({ onClick, href }: { onClick?: () => void; href?: string }) {
  return href ? (
    <Link href={href} className={linkBtn}>
      🏠 Home
    </Link>
  ) : (
    <button onClick={onClick} className={linkBtn}>
      🏠 Home
    </button>
  );
}

function Register({ onSubmit, onHome }: { onSubmit: (p: Profile, photo: string | undefined, meals: boolean) => void; onHome?: () => void }) {
  const [photo, setPhoto] = useState<string | undefined>();
  const [meals, setMeals] = useState(true);
  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-8 lg:grid-cols-[1fr_1.1fr] lg:py-14">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <Logo />
          <div className="flex gap-2">
            {onHome && <HomeButton onClick={onHome} />}
            <InstallApp />
          </div>
        </div>
        <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl">
          Your body. <span className="bg-linear-to-r from-cyan-300 to-orange-300 bg-clip-text text-transparent">Your 9-month blueprint.</span>
        </h1>
        <p className="text-slate-300">
          Register and get a membership card, a full 3-month gym schedule, an optional day-by-day meal plan, and the separate 21-day military calisthenics program with 3D
          workout videos. Every 3 months we check your weight and goals again and build the next phase.
        </p>
        <div className="stage relative h-72 overflow-hidden rounded-3xl border border-white/10 sm:h-96">
          <Mannequin3D anim="jumpingjack" autoRotate />
          <Link href="/military" className="absolute right-3 top-3 rounded-xl border border-orange-300/40 bg-black/50 px-3 py-1.5 text-xs font-semibold text-orange-100 hover:bg-orange-400/20">
            🎖 Just want the 21-day military program? →
          </Link>
          <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2">
            {PHASES.map((p, i) => (
              <Badge key={p.name} tone={i === 0 ? "cyan" : i === 1 ? "orange" : "rose"}>
                Months {i * 3 + 1}-{i * 3 + 3}: {p.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      <TiltCard max={2} className="p-6">
        <div className="text-xs uppercase tracking-widest text-cyan-300">New member registration</div>
        <div className="mb-5 mt-1 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black text-white">Tell us about you</h2>
          <PhotoPicker photo={photo} onChange={setPhoto} size="h-20 w-20" />
        </div>
        <label className="mb-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 p-3">
          <input type="checkbox" checked={meals} onChange={(e) => setMeals(e.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-400" />
          <span>
            <span className="block text-sm font-semibold text-white">🥗 Include a 3-month meal plan</span>
            <span className="block text-xs text-slate-400">Day-by-day meals and water timeline (you can add or remove it later)</span>
          </span>
        </label>
        <ProfileForm mode="register" onSubmit={(p) => onSubmit(p, photo, meals)} onCancel={onHome} />
      </TiltCard>
    </main>
  );
}

/** Stand-alone Military Calisthenics 21 page — its own schedule, works with or without a membership. */
function MilitaryApp() {
  const { state, ready, actions } = useAppState();
  const [demo, setDemo] = useState<string | null>(null);
  const [player, setPlayer] = useState<PlayerState>(null);
  const [exporting, setExporting] = useState(false);
  if (!ready) return <div className="grid flex-1 place-items-center text-slate-400">Loading…</div>;
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-orange-300/10 bg-[#050810]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <HomeButton href="/" />
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-linear-to-br from-orange-300 to-rose-600 text-xl shadow-[0_5px_0_#9f1239,0_10px_25px_-5px_rgba(249,115,22,.6)]">🎖</div>
            <div>
              <div className="text-base font-black tracking-[0.12em] text-white sm:text-lg">MILITARY CALISTHENICS 21</div>
              <div className="text-xs text-slate-400">{state.member ? `${state.member.profile.name} · ${state.member.membershipNo}` : "Guest mode · 20-min daily sessions"}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {state.cali && (
              <Button variant="ghost" className="px-3 py-2" onClick={() => setExporting(true)}>
                📄 PDF / Print
              </Button>
            )}
            <InstallApp />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <CaliView state={state} actions={actions} onDemo={setDemo} onPlay={(title, exercises, onDone) => setPlayer({ title, exercises, onDone })} />
      </main>
      <ExerciseDemo id={demo} onClose={() => setDemo(null)} />
      {player && <WorkoutPlayer open title={player.title} exercises={player.exercises} onComplete={player.onDone} onClose={() => setPlayer(null)} />}
      {exporting && <ExportDialog open state={state} onClose={() => setExporting(false)} initial={{ details: !!state.member, gym: false, cali: true }} />}
    </div>
  );
}

function AdminApp() {
  const app = useAppState();
  if (!app.ready) return <div className="grid flex-1 place-items-center text-slate-400">Loading…</div>;
  return <AdminView {...app} />;
}

export default function App({ section = "gym" }: { section?: "gym" | "military" | "admin" }) {
  if (section === "military") return <MilitaryApp />;
  if (section === "admin") return <AdminApp />;
  return <GymApp />;
}

function GymApp() {
  const { store, state, ready, actions } = useAppState();
  const [tab, setTab] = useState("today");
  const [adding, setAdding] = useState(false);
  const [demo, setDemo] = useState<string | null>(null);
  const [player, setPlayer] = useState<PlayerState>(null);
  const [checkIn, setCheckIn] = useState<null | "auto" | "manual">(null);
  const [welcome, setWelcome] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [q, setQ] = useState("");

  const due = ready && !!state.member && needsCheckIn(state);
  // When 3 months are up, ask for the member's details again automatically.
  useEffect(() => {
    if (due && state.autoAdvance) setCheckIn((c) => c ?? "auto");
  }, [due, state.autoAdvance]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? store.members.filter((m) => `${m.member.profile.name} ${m.member.membershipNo} ${m.member.profile.phone}`.toLowerCase().includes(s)) : store.members;
  }, [store.members, q]);

  if (!ready) return <div className="grid flex-1 place-items-center text-slate-400">Loading…</div>;

  // ---------- registration ----------
  if (adding) {
    return (
      <Register
        onHome={() => setAdding(false)}
        onSubmit={(p, photo, meals) => {
          actions.register(p, photo, meals);
          setAdding(false);
          setTab("today");
          setWelcome(true);
        }}
      />
    );
  }

  // ---------- home: member cards ----------
  if (!state.member) {
    return (
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-white/5 bg-[#050810]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Logo />
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/military" className={linkBtn}>
                🎖 Military 21
              </Link>
              <Link href="/admin" className={linkBtn}>
                🔐 Admin
              </Link>
              <InstallApp />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-10 px-4 py-8">
          {/* hero */}
          <section className="grid items-center gap-6 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <div className="text-xs uppercase tracking-widest text-cyan-300">IronForge Gym</div>
              <h1 className="mt-2 text-4xl font-black leading-tight text-white sm:text-5xl">
                Train smarter. <span className="bg-linear-to-r from-cyan-300 to-orange-300 bg-clip-text text-transparent">Every 3 months, a new you.</span>
              </h1>
              <p className="mt-3 text-slate-300">
                Member cards, 3-month gym schedules that renew after each check-in, day-by-day meal plans, the 21-day military calisthenics program, attendance
                calendar, 3D workout videos and PDF printouts — all in one app.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="accent" onClick={() => setAdding(true)}>
                  ＋ Register new member
                </Button>
                <Link href="/military" className={linkBtn}>
                  🎖 Military 21 (20 min/day)
                </Link>
                <Link href="/admin" className={linkBtn}>
                  🔐 Admin
                </Link>
              </div>
            </div>
            <div className="stage relative h-72 overflow-hidden rounded-3xl border border-white/10 sm:h-80">
              <Mannequin3D anim="burpee" autoRotate interactive={false} />
              <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2">
                {PHASES.map((p, i) => (
                  <Badge key={p.name} tone={i === 0 ? "cyan" : i === 1 ? "orange" : "rose"}>
                    Months {i * 3 + 1}-{i * 3 + 3}: {p.name}
                  </Badge>
                ))}
              </div>
            </div>
          </section>

          {/* everything the app does */}
          <section>
            <h2 className="text-xl font-black text-white">Everything in IronForge</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {(
                [
                  ["🪪", "Member card", "Auto membership number, photo & all details", "member"],
                  ["📅", "3-month gym schedule", "Auto check-in & new phase every 3 months", "plan"],
                  ["🥗", "Meal plan", "Day-by-day meals & water timeline (optional)", "meals"],
                  ["🎖", "Military 21", "21 days · 20-minute sessions with timer", "/military"],
                  ["📈", "Progress", "Weight trend & results every 3 months", "progress"],
                  ["🗓", "Attendance", "Time in / time out with calendar", "member"],
                  ["📄", "PDF & print", "Schedule, meals, progress — pick what to include", "plan"],
                  ["🔐", "Admin", "Add, view, edit, delete members, backups", "/admin"],
                ] as const
              ).map(([icon, title, sub, target]) => {
                const inner = (
                  <>
                    <div className="text-2xl">{icon}</div>
                    <div className="mt-1 font-bold text-white">{title}</div>
                    <div className="text-xs text-slate-400">{sub}</div>
                  </>
                );
                const cls =
                  "btn3d block rounded-2xl border border-white/10 bg-linear-to-br from-white/10 to-white/[.02] p-4 text-left shadow-[0_6px_0_rgba(255,255,255,.06)] transition hover:-translate-y-0.5 hover:border-cyan-300/40";
                return target.startsWith("/") ? (
                  <Link key={title} href={target} className={cls}>
                    {inner}
                  </Link>
                ) : (
                  <button
                    key={title}
                    className={cls}
                    onClick={() => {
                      if (store.members.length === 0) return setAdding(true);
                      if (store.members.length === 1) {
                        actions.selectMember(store.members[0].id);
                        setTab(target);
                      } else {
                        setTab(target);
                        document.getElementById("members")?.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                  >
                    {inner}
                  </button>
                );
              })}
            </div>
          </section>

          <section id="members">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-cyan-300">Members on this device</div>
              <h2 className="text-3xl font-black text-white">{store.members.length ? "Choose your member card" : "No members yet"}</h2>
            </div>
            {store.members.length > 0 && <input className={cx(inputCls, "max-w-xs")} placeholder="Search name, number, phone…" value={q} onChange={(e) => setQ(e.target.value)} />}
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((rec) => (
              <MemberCard
                key={rec.id}
                rec={rec}
                onOpen={() => {
                  actions.selectMember(rec.id);
                }}
              />
            ))}
            <button
              onClick={() => setAdding(true)}
              className="grid min-h-56 place-items-center rounded-[24px] border-2 border-dashed border-white/15 text-center transition hover:border-cyan-300/50 hover:bg-cyan-400/5"
            >
              <div>
                <div className="text-4xl text-cyan-300">＋</div>
                <div className="mt-1 font-bold text-white">Add new member</div>
                <div className="text-xs text-slate-400">Registration creates a membership number automatically</div>
              </div>
            </button>
          </div>
          {q && filtered.length === 0 && <p className="mt-6 text-sm text-slate-400">No members match “{q}”.</p>}
          </section>
        </main>
      </div>
    );
  }

  // ---------- member page ----------
  const plan = currentPlan(state);
  const next = plan ? phaseFor(plan.cycle + 1) : null;
  const onPlay = (title: string, exercises: PlannedExercise[], onDone: () => void) => setPlayer({ title, exercises, onDone });
  const activeRec = store.members.find((m) => m.id === store.activeId)!;
  const goHome = () => actions.selectMember(null);

  return (
    <div className="flex flex-1 flex-col">
      <header className="no-print sticky top-0 z-30 border-b border-white/5 bg-[#050810]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <HomeButton onClick={goHome} />
            <Logo />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {state.member.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={state.member.photo} alt="" className="h-10 w-10 rounded-xl object-cover ring-2 ring-cyan-300/50" />
            )}
            <div className="text-right">
              <div className="text-sm font-semibold text-white">{state.member.profile.name}</div>
              <div className="font-mono text-xs text-cyan-300">{state.member.membershipNo}</div>
            </div>
            <TimeClock state={state} actions={actions} compact />
            <Button variant="ghost" className="px-3 py-2" onClick={() => setExporting(true)}>
              📄 PDF / Print
            </Button>
            <InstallApp />
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cx(
                "btn3d shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition",
                tab === t.id ? "bg-white/10 text-white shadow-[0_4px_0_rgba(34,211,238,.6)]" : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <span className="mr-1.5">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {due && !checkIn && (
        <div className="no-print mx-auto mt-4 w-full max-w-7xl px-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-300/40 bg-orange-400/10 px-4 py-3 text-sm text-orange-100">
            The 3-month phase has ended. Complete the check-in to generate the next phase.
            <Button variant="accent" onClick={() => setCheckIn("manual")}>
              Start check-in
            </Button>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {tab === "today" && <TodayView state={state} actions={actions} onDemo={setDemo} onPlay={onPlay} onGoto={setTab} onCheckIn={() => setCheckIn("manual")} />}
        {tab === "progress" && <ProgressView state={state} actions={actions} onCheckIn={() => setCheckIn("manual")} />}
        {tab === "plan" && <GymPlanView state={state} actions={actions} onDemo={setDemo} onPlay={onPlay} onCheckIn={() => setCheckIn("manual")} onExport={() => setExporting(true)} />}
        {tab === "meals" && <MealPlanView state={state} actions={actions} onExport={() => setExporting(true)} />}
        {tab === "cali" && <CaliView state={state} actions={actions} onDemo={setDemo} onPlay={onPlay} />}
        {tab === "member" && <MembershipView state={state} actions={actions} />}
        {tab === "profile" && <ProfileView state={state} actions={actions} memberId={activeRec.id} />}
      </main>

      <footer className="no-print py-6 text-center text-xs text-slate-600">IronForge Gym · each member is saved separately on this device</footer>

      <ExerciseDemo id={demo} onClose={() => setDemo(null)} />
      {player && <WorkoutPlayer open title={player.title} exercises={player.exercises} onComplete={player.onDone} onClose={() => setPlayer(null)} />}
      {exporting && <ExportDialog open state={state} onClose={() => setExporting(false)} />}

      <Modal open={welcome} onClose={() => setWelcome(false)}>
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest text-cyan-300">Registration complete 🎉</div>
          <h2 className="mt-1 text-2xl font-black text-white">Welcome, {state.member.profile.name}!</h2>
          <p className="mt-2 text-sm text-slate-400">Your member card and membership number were created automatically. Tap the card to open your page.</p>
        </div>
        <div className="mx-auto mt-5 max-w-md">
          <MemberCard rec={activeRec} onOpen={() => setWelcome(false)} />
        </div>
        <div className="mt-5 flex justify-center gap-3">
          <Button variant="ghost" onClick={() => navigator.clipboard?.writeText(state.member!.membershipNo)}>
            Copy number
          </Button>
          <Button onClick={() => setWelcome(false)}>Open my page</Button>
        </div>
      </Modal>

      <Modal open={!!checkIn} onClose={() => setCheckIn(null)}>
        <div className="text-xs uppercase tracking-widest text-orange-300">{due ? "3-month check-in" : "Early check-in"}</div>
        <h2 className="mt-1 text-2xl font-black text-white">{due ? "Phase complete — how are you now?" : "Start the next phase now?"}</h2>
        <p className="mb-5 mt-1 text-sm text-slate-400">
          Update weight, height and goal. We&apos;ll use them to build{" "}
          <span className="text-white">{next ? `Phase ${plan!.cycle + 1} · ${PHASES[next.idx].name}` : "the next phase"}</span>
          {state.mealSeed !== undefined ? " and a new meal plan" : ""} for the next 3 months.
        </p>
        <ProfileForm
          key={checkIn ?? "closed"}
          mode="checkin"
          initial={state.member.profile}
          onCancel={() => setCheckIn(null)}
          onSubmit={(p, note) => {
            actions.checkInAndAdvance(p, due ? "auto" : "manual", note || (due ? "3-month check-in" : "Early check-in"));
            if (state.mealSeed !== undefined) actions.newMealPlan();
            setCheckIn(null);
            setTab("progress");
          }}
        />
      </Modal>
    </div>
  );
}
