"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { diffDays, formatDate, formatTime, today, toISODate } from "@/lib/date";
import { hashPin, needsCheckIn, type useAppState } from "@/lib/store";
import type { MemberRecord } from "@/lib/types";
import EditMemberModal from "./EditMemberModal";
import { daysSinceUpdate, WeeklyProgressModal } from "./WeeklyProgress";
import InstallApp from "./InstallApp";
import ProfileForm from "./ProfileForm";
import { PhotoPicker } from "./ProgressView";
import { Badge, Button, cx, inputCls, Modal, Stat, TiltCard } from "./ui";

type App = ReturnType<typeof useAppState>;
const UNLOCK_KEY = "ironforge-admin-unlocked";

function PinGate({ hash, onUnlock }: { hash: string; onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  return (
    <main className="grid flex-1 place-items-center px-4">
      <TiltCard className="w-full max-w-sm text-center">
        <div className="text-4xl">🔐</div>
        <h1 className="mt-2 text-2xl font-black text-white">Admin login</h1>
        <form
          className="mt-4 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if ((await hashPin(pin)) === hash) {
              try {
                sessionStorage.setItem(UNLOCK_KEY, "1");
              } catch {}
              onUnlock();
            } else setErr("Wrong PIN");
          }}
        >
          <input autoFocus type="password" inputMode="numeric" className={cx(inputCls, "text-center text-2xl tracking-[0.5em]")} value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" />
          {err && <div className="text-sm text-rose-300">{err}</div>}
          <Button type="submit" className="w-full">
            Unlock
          </Button>
        </form>
        <Link href="/" className="mt-4 inline-block text-xs text-slate-400 hover:text-white">
          🏠 Back to home
        </Link>
      </TiltCard>
    </main>
  );
}

export default function AdminView({ store, actions }: App) {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(false);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [newPhoto, setNewPhoto] = useState<string | undefined>();
  const [newMeals, setNewMeals] = useState(true);
  const [editing, setEditing] = useState<MemberRecord | null>(null);
  const [weekly, setWeekly] = useState<MemberRecord | null>(null);
  const [pinModal, setPinModal] = useState(false);
  const [pin1, setPin1] = useState("");
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      setUnlocked(sessionStorage.getItem(UNLOCK_KEY) === "1");
    } catch {}
  }, []);

  const t = today();
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return store.members
      .filter((m) => !s || `${m.member.profile.name} ${m.member.membershipNo} ${m.member.profile.phone} ${m.member.profile.address}`.toLowerCase().includes(s))
      .sort((a, b) => a.member.profile.name.localeCompare(b.member.profile.name));
  }, [store.members, q]);

  if (store.adminPinHash && !unlocked) return <PinGate hash={store.adminPinHash} onUnlock={() => setUnlocked(true)} />;

  const inGym = store.members.filter((m) => m.attendance.some((a) => !a.timeOut));
  const visitsToday = store.members.reduce((s, m) => s + m.attendance.filter((a) => toISODate(new Date(a.timeIn)) === t).length, 0);
  const due = store.members.filter((m) => needsCheckIn(m));
  const weeklyDue = store.members.filter((m) => daysSinceUpdate(m.member, m.progress, m.checkIns) >= 7);

  const open = (id: string) => {
    actions.selectMember(id);
    setTimeout(() => router.push("/"), 60);
  };

  const download = (name: string, text: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const membersPdf = async (out: "download" | "print") => {
    const { membersPdf } = await import("@/lib/pdf");
    await membersPdf(
      rows.map((m) => ({
        name: m.member.profile.name,
        no: m.member.membershipNo,
        phone: m.member.profile.phone,
        phase: m.plans[m.plans.length - 1]?.phaseName ?? "-",
        weight: `${m.member.profile.weightKg} kg`,
        visits: m.attendance.length,
        joined: formatDate(toISODate(new Date(m.member.joinedAt)), { day: "numeric", month: "short", year: "numeric" }),
      })),
      out,
    );
  };

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#050810]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              onClick={() => actions.selectMember(null)}
              className="btn3d inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 shadow-[0_4px_0_rgba(255,255,255,.08)] hover:bg-white/10"
            >
              🏠 Home
            </Link>
            <div>
              <div className="text-lg font-black tracking-[0.15em] text-white">ADMIN</div>
              <div className="text-xs text-slate-400">Manage members on this device</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" className="px-3 py-2" onClick={() => setPinModal(true)}>
              🔑 {store.adminPinHash ? "Change PIN" : "Set PIN"}
            </Button>
            {store.adminPinHash && (
              <Button
                variant="ghost"
                className="px-3 py-2"
                onClick={() => {
                  try {
                    sessionStorage.removeItem(UNLOCK_KEY);
                  } catch {}
                  setUnlocked(false);
                }}
              >
                🔒 Lock
              </Button>
            )}
            <InstallApp />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-5 px-4 py-6">
        {!store.adminPinHash && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            No admin PIN yet — anyone using this device can open this page. Set a PIN to protect it.
            <Button variant="accent" onClick={() => setPinModal(true)}>
              Set admin PIN
            </Button>
          </div>
        )}
        {msg && <div className="rounded-2xl border border-emerald-300/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{msg}</div>}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Members" value={store.members.length} />
          <Stat label="In gym now" value={inGym.length} sub={inGym.map((m) => m.member.profile.name.split(" ")[0]).join(", ") || "—"} />
          <Stat label="Visits today" value={visitsToday} />
          <Stat label="Check-ins due" value={due.length} sub="3-month phase ended" />
          <Stat label="Weekly updates due" value={weeklyDue.length} sub="7+ days since last" />
        </div>

        <TiltCard max={1}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input className={cx(inputCls, "max-w-xs")} placeholder="Search name, number, phone, address…" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setAdding(true)}>＋ Add member</Button>
              <Button variant="ghost" onClick={() => membersPdf("download")} disabled={!rows.length}>
                📄 Members PDF
              </Button>
              <Button variant="ghost" onClick={() => membersPdf("print")} disabled={!rows.length}>
                🖨 Print list
              </Button>
              <Button variant="ghost" onClick={() => download(`ironforge-backup-${t}.json`, actions.exportBackup())}>
                💾 Save backup
              </Button>
              <Button variant="ghost" onClick={() => fileRef.current?.click()}>
                ⤴ Restore backup
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  try {
                    const text = await f.text();
                    const replace = confirm("Replace ALL members on this device with the backup?\n\nOK = replace everything\nCancel = merge (add/update members from the backup)");
                    actions.importBackup(text, replace ? "replace" : "merge");
                    setMsg(`Backup restored (${replace ? "replaced" : "merged"}).`);
                  } catch (x) {
                    alert((x as Error).message);
                  }
                }}
              />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-2 pr-3">Member</th>
                  <th className="py-2 pr-3">Phone</th>
                  <th className="py-2 pr-3">Phase</th>
                  <th className="py-2 pr-3">Weight</th>
                  <th className="py-2 pr-3">Visits</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((m) => {
                  const p = m.member.profile;
                  const plan = m.plans[m.plans.length - 1];
                  const openVisit = m.attendance.find((a) => !a.timeOut);
                  const last = m.attendance[m.attendance.length - 1];
                  return (
                    <tr key={m.id} className="align-middle">
                      <td className="py-2.5 pr-3">
                        <button className="flex items-center gap-3 text-left" onClick={() => open(m.id)}>
                          {m.member.photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.member.photo} alt="" className="h-10 w-10 rounded-xl object-cover" />
                          ) : (
                            <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400/15 font-bold text-cyan-200">{p.name.slice(0, 1)}</span>
                          )}
                          <span>
                            <span className="block font-semibold text-white hover:text-cyan-200">{p.name}</span>
                            <span className="block font-mono text-xs text-cyan-300">{m.member.membershipNo}</span>
                          </span>
                        </button>
                      </td>
                      <td className="py-2.5 pr-3 text-slate-300">{p.phone || "—"}</td>
                      <td className="py-2.5 pr-3 text-slate-300">
                        {plan?.phaseName ?? "—"}
                        {plan && <div className="text-xs text-slate-500">{Math.max(0, diffDays(t, plan.endDate))} days left</div>}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-300">{p.weightKg} kg</td>
                      <td className="py-2.5 pr-3 text-slate-300">
                        {m.attendance.length}
                        {last && <div className="text-xs text-slate-500">last {formatDate(toISODate(new Date(last.timeIn)), { day: "numeric", month: "short" })}</div>}
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="flex flex-wrap gap-1">
                          {openVisit && <Badge tone="green">In since {formatTime(openVisit.timeIn)}</Badge>}
                          {needsCheckIn(m) && <Badge tone="orange">Check-in due</Badge>}
                          {daysSinceUpdate(m.member, m.progress, m.checkIns) >= 7 && <Badge tone="rose">Weekly due</Badge>}
                          {m.mealSeed !== undefined && <Badge tone="slate">Meals</Badge>}
                          {m.cali && <Badge tone="rose">Mil-21 R{m.cali.round}</Badge>}
                        </div>
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1.5">
                          {openVisit ? (
                            <button className="rounded-lg bg-rose-500/20 px-2 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-500/30" onClick={() => actions.memberTimeOut(m.id)}>
                              Time out
                            </button>
                          ) : (
                            <button className="rounded-lg bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/30" onClick={() => actions.memberTimeIn(m.id)}>
                              Time in
                            </button>
                          )}
                          <button className="rounded-lg bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/30" onClick={() => setWeekly(m)}>
                            Weekly update
                          </button>
                          <button className="rounded-lg bg-white/10 px-2 py-1 text-xs font-semibold text-slate-100 hover:bg-white/20" onClick={() => open(m.id)}>
                            Open
                          </button>
                          <button className="rounded-lg bg-white/10 px-2 py-1 text-xs font-semibold text-slate-100 hover:bg-white/20" onClick={() => setEditing(m)}>
                            Edit
                          </button>
                          <button
                            className="rounded-lg bg-white/5 px-2 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
                            onClick={() => confirm(`Delete ${p.name} (${m.member.membershipNo}) and all their data?`) && actions.deleteMember(m.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length === 0 && <p className="py-6 text-center text-sm text-slate-400">{store.members.length ? "No members match your search." : "No members yet — add the first one."}</p>}
          </div>
        </TiltCard>

        <p className="text-xs text-slate-500">
          Data lives in this browser only. Use “Save backup” regularly, and “Restore backup” to move members to another device. Sharing members across phones in real time needs an
          online database.
        </p>
      </main>

      {weekly && (
        <WeeklyProgressModal memberId={weekly.id} member={weekly.member} by="admin" actions={actions} onClose={() => { setWeekly(null); setMsg("Weekly update saved."); }} />
      )}
      {editing && <EditMemberModal key={editing.id} rec={store.members.find((m) => m.id === editing.id) ?? null} actions={actions} onClose={() => setEditing(null)} />}

      <Modal open={adding} onClose={() => setAdding(false)}>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-cyan-300">Admin</div>
            <h2 className="text-xl font-black text-white">Add member</h2>
          </div>
          <PhotoPicker photo={newPhoto} onChange={setNewPhoto} size="h-20 w-20" />
        </div>
        <label className="mb-4 flex items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" checked={newMeals} onChange={(e) => setNewMeals(e.target.checked)} className="h-4 w-4 accent-emerald-400" /> Include 3-month meal plan
        </label>
        <ProfileForm
          key={adding ? "open" : "closed"}
          mode="register"
          submitLabel="Add member"
          onCancel={() => setAdding(false)}
          onSubmit={(p) => {
            actions.addMember(p, newPhoto, newMeals);
            setNewPhoto(undefined);
            setAdding(false);
            setMsg(`${p.name} added — membership number created.`);
          }}
        />
      </Modal>

      <Modal open={pinModal} onClose={() => setPinModal(false)}>
        <h2 className="text-xl font-black text-white">{store.adminPinHash ? "Change admin PIN" : "Set admin PIN"}</h2>
        <p className="mt-1 text-sm text-slate-400">4–8 digits. Needed to open the Admin page on this device.</p>
        <form
          className="mt-4 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!/^\d{4,8}$/.test(pin1)) return alert("Use 4 to 8 digits");
            await actions.setAdminPin(pin1);
            try {
              sessionStorage.setItem(UNLOCK_KEY, "1");
            } catch {}
            setPin1("");
            setPinModal(false);
            setMsg("Admin PIN saved.");
          }}
        >
          <input type="password" inputMode="numeric" className={cx(inputCls, "tracking-[0.4em]")} value={pin1} onChange={(e) => setPin1(e.target.value)} placeholder="New PIN" />
          <Button type="submit">Save</Button>
        </form>
        {store.adminPinHash && (
          <button
            className="mt-3 text-xs text-rose-300 hover:text-rose-200"
            onClick={async () => {
              if (!confirm("Remove the admin PIN?")) return;
              await actions.setAdminPin(null);
              setPinModal(false);
            }}
          >
            Remove PIN
          </button>
        )}
      </Modal>
    </div>
  );
}
