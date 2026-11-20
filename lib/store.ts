"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateCali } from "./calisthenics";
import { addDays, diffDays, today } from "./date";
import { generatePlan, newSeed } from "./gymPlan";
import type { AppState, CaliProgram, CheckIn, Level, MemberRecord, Profile, Store } from "./types";

// Storage layout: one index key + one key per member, so every member is saved separately.
const INDEX_KEY = "ironforge-index-v2";
const MEMBER_KEY = (id: string) => `ironforge-member-${id}`;
const LEGACY_KEY = "ironforge-gym-v1";

const EMPTY_STORE: Store = { version: 2, members: [], activeId: null, guestCali: null, autoAdvance: true };

interface IndexFile {
  version: 2;
  memberIds: string[];
  activeId: string | null;
  guestCali: CaliProgram | null;
  autoAdvance: boolean;
  adminPinHash?: string;
}

const uid = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/-/g, "").slice(0, 12);

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (raw) {
      const idx = JSON.parse(raw) as IndexFile;
      const members = idx.memberIds
        .map((id) => {
          try {
            return JSON.parse(localStorage.getItem(MEMBER_KEY(id)) || "null") as MemberRecord | null;
          } catch {
            return null;
          }
        })
        .filter((m): m is MemberRecord => !!m);
      return { version: 2, members, activeId: idx.activeId, guestCali: idx.guestCali, autoAdvance: idx.autoAdvance, adminPinHash: idx.adminPinHash };
    }
    // migrate the single-member format from the first version of the app
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const old = JSON.parse(legacy) as AppState;
      if (old.member) {
        const rec: MemberRecord = {
          id: uid(),
          member: old.member,
          checkIns: old.checkIns ?? [],
          plans: old.plans ?? [],
          completedDays: old.completedDays ?? [],
          attendance: old.attendance ?? [],
          cali: old.cali ?? null,
          updatedAt: new Date().toISOString(),
        };
        return { ...EMPTY_STORE, members: [rec], activeId: rec.id, autoAdvance: old.autoAdvance ?? true };
      }
    }
  } catch {}
  return EMPTY_STORE;
}

export function makeMembershipNo(existing: string[] = []) {
  const year = new Date().getFullYear();
  let no = "";
  do no = `IFG-${year}-${Math.floor(100000 + Math.random() * 900000)}`;
  while (existing.includes(no));
  return no;
}

export function currentPlan(s: { plans: AppState["plans"] }) {
  return s.plans[s.plans.length - 1];
}

/** The current plan has ended and the member must fill the 3-month check-in form. */
export function needsCheckIn(s: { plans: AppState["plans"] }, on = today()) {
  const plan = currentPlan(s);
  return !!plan && diffDays(on, plan.endDate) <= 0;
}

/** Military rounds advance on their own: after 21 days the next (harder) round starts. */
function advanceCali(cali: CaliProgram | null): CaliProgram | null {
  if (!cali) return cali;
  let c = cali;
  while (diffDays(addDays(c.startDate, 21), today()) >= 0) {
    c = generateCali({ startDate: addDays(c.startDate, 21), level: c.level, round: c.round + 1, createdBy: "auto" });
  }
  return c;
}

function autoAdvanceAll(s: Store): Store {
  if (!s.autoAdvance) return s;
  let changed = false;
  const members = s.members.map((m) => {
    const cali = advanceCali(m.cali);
    if (cali === m.cali) return m;
    changed = true;
    return { ...m, cali };
  });
  const guestCali = advanceCali(s.guestCali);
  return changed || guestCali !== s.guestCali ? { ...s, members, guestCali } : s;
}

function toView(s: Store): AppState {
  const rec = s.members.find((m) => m.id === s.activeId);
  return rec
    ? { version: 1, member: rec.member, checkIns: rec.checkIns, plans: rec.plans, completedDays: rec.completedDays, attendance: rec.attendance, cali: rec.cali, mealSeed: rec.mealSeed, autoAdvance: s.autoAdvance }
    : { version: 1, member: null, checkIns: [], plans: [], completedDays: [], attendance: [], cali: s.guestCali, autoAdvance: s.autoAdvance };
}

export function memberView(s: Store, id: string): AppState | null {
  const rec = s.members.find((m) => m.id === id);
  return rec ? toView({ ...s, activeId: id }) : null;
}

export async function hashPin(pin: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`ironforge:${pin}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function newRecord(profile: Profile, photo: string | undefined, existingNos: string[], meals = true): MemberRecord {
  const date = today();
  return {
    id: uid(),
    member: { membershipNo: makeMembershipNo(existingNos), joinedAt: new Date().toISOString(), profile, photo },
    checkIns: [{ date, weightKg: profile.weightKg, heightCm: profile.heightCm, goal: profile.goal, level: profile.level, note: "Registration" }],
    plans: [generatePlan({ profile, cycle: 1, startDate: date, seed: newSeed(), createdBy: "registration" })],
    completedDays: [],
    attendance: [],
    cali: null,
    mealSeed: meals ? newSeed() : undefined,
    updatedAt: new Date().toISOString(),
  };
}

export function useAppState() {
  const [store, setStore] = useState<Store>(EMPTY_STORE);
  const [ready, setReady] = useState(false);
  const saved = useRef(new Map<string, MemberRecord>());

  useEffect(() => {
    const s = autoAdvanceAll(loadStore());
    setStore(s);
    setReady(true);
    const id = setInterval(() => setStore((x) => autoAdvanceAll(x)), 60_000);
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("ironforge-")) setStore(loadStore());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      clearInterval(id);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // persist: index + only the member records that changed; remove deleted members
  useEffect(() => {
    if (!ready) return;
    try {
      const idx: IndexFile = {
        version: 2,
        memberIds: store.members.map((m) => m.id),
        activeId: store.activeId,
        guestCali: store.guestCali,
        autoAdvance: store.autoAdvance,
        adminPinHash: store.adminPinHash,
      };
      localStorage.setItem(INDEX_KEY, JSON.stringify(idx));
      const ids = new Set(store.members.map((m) => m.id));
      for (const m of store.members) {
        if (saved.current.get(m.id) !== m) {
          localStorage.setItem(MEMBER_KEY(m.id), JSON.stringify(m));
          saved.current.set(m.id, m);
        }
      }
      for (const id of [...saved.current.keys()]) {
        if (!ids.has(id)) {
          localStorage.removeItem(MEMBER_KEY(id));
          saved.current.delete(id);
        }
      }
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      alert("Could not save — device storage may be full. Try a smaller photo or delete old members.");
    }
  }, [store, ready]);

  /** Apply a change to the active member (or to the guest military program when no member is open). */
  const updateActive = useCallback((fn: (v: AppState) => AppState) => {
    setStore((s) => {
      const before = toView(s);
      const v = fn(before);
      if (v === before) return s;
      if (!before.member) return { ...s, guestCali: v.cali, autoAdvance: v.autoAdvance };
      return {
        ...s,
        autoAdvance: v.autoAdvance,
        members: s.members.map((m) =>
          m.id === s.activeId
            ? { ...m, member: v.member!, checkIns: v.checkIns, plans: v.plans, completedDays: v.completedDays, attendance: v.attendance, cali: v.cali, mealSeed: v.mealSeed, updatedAt: new Date().toISOString() }
            : m,
        ),
      };
    });
  }, []);

  const state = useMemo(() => toView(store), [store]);

  const actions = {
    // ---------- members (add / open / edit / delete) ----------
    /** Add a new member and open them. Returns nothing; the new member becomes active. */
    register(profile: Profile, photo?: string, meals = true) {
      setStore((s) => {
        const rec = newRecord(profile, photo, s.members.map((m) => m.member.membershipNo), meals);
        return { ...s, members: [...s.members, rec], activeId: rec.id };
      });
    },
    /** Add a member without opening them (admin). */
    addMember(profile: Profile, photo?: string, meals = true) {
      setStore((s) => ({ ...s, members: [...s.members, newRecord(profile, photo, s.members.map((m) => m.member.membershipNo), meals)] }));
    },
    selectMember(id: string | null) {
      setStore((s) => ({ ...s, activeId: id }));
    },
    /** Edit any member's details; optionally rebuild their current 3-month phase from the new details. */
    updateMember(id: string, profile: Profile, opts: { photo?: string | null; rebuild?: boolean } = {}) {
      setStore((s) => ({
        ...s,
        members: s.members.map((m) => {
          if (m.id !== id) return m;
          const member = { ...m.member, profile, ...(opts.photo !== undefined ? { photo: opts.photo ?? undefined } : {}) };
          let plans = m.plans;
          const prev = currentPlan(m);
          if (opts.rebuild && prev) {
            plans = [...m.plans.slice(0, -1), generatePlan({ profile, cycle: prev.cycle, startDate: prev.startDate, seed: newSeed(), createdBy: "manual" })];
          }
          return { ...m, member, plans, updatedAt: new Date().toISOString() };
        }),
      }));
    },
    deleteMember(id: string) {
      setStore((s) => ({ ...s, members: s.members.filter((m) => m.id !== id), activeId: s.activeId === id ? null : s.activeId }));
    },
    memberTimeIn(id: string) {
      setStore((s) => ({
        ...s,
        members: s.members.map((m) =>
          m.id !== id || m.attendance.some((a) => !a.timeOut) ? m : { ...m, attendance: [...m.attendance, { id: uid(), timeIn: new Date().toISOString() }] },
        ),
      }));
    },
    memberTimeOut(id: string) {
      setStore((s) => ({
        ...s,
        members: s.members.map((m) => (m.id !== id ? m : { ...m, attendance: m.attendance.map((a) => (a.timeOut ? a : { ...a, timeOut: new Date().toISOString() })) })),
      }));
    },

    // ---------- admin ----------
    async setAdminPin(pin: string | null) {
      const h = pin ? await hashPin(pin) : undefined;
      setStore((s) => ({ ...s, adminPinHash: h }));
    },
    exportBackup(): string {
      return JSON.stringify({ app: "ironforge", exportedAt: new Date().toISOString(), store }, null, 2);
    },
    importBackup(json: string, mode: "merge" | "replace") {
      const data = JSON.parse(json) as { app?: string; store?: Store };
      if (data.app !== "ironforge" || !data.store?.members) throw new Error("This is not an IronForge backup file");
      setStore((s) => {
        if (mode === "replace") return { ...data.store!, version: 2, activeId: null };
        const byId = new Map(s.members.map((m) => [m.id, m]));
        for (const m of data.store!.members) byId.set(m.id, m);
        return { ...s, members: [...byId.values()] };
      });
    },

    // ---------- active member ----------
    /** Save new stats and generate the next 3-month phase. */
    checkInAndAdvance(profile: Profile, mode: "auto" | "manual", note?: string) {
      updateActive((s) => {
        if (!s.member) return s;
        const prev = currentPlan(s);
        const ended = prev && diffDays(today(), prev.endDate) <= 0;
        const start = ended && mode === "auto" ? prev.endDate : today();
        // if the member returns very late, start the new phase today rather than in the past
        const startDate = diffDays(start, today()) > 7 ? today() : start;
        const plans = s.plans.map((p) => (p === prev && diffDays(startDate, p.endDate) > 0 ? { ...p, endDate: startDate } : p));
        const checkIn: CheckIn = { date: today(), weightKg: profile.weightKg, heightCm: profile.heightCm, goal: profile.goal, level: profile.level, note };
        return {
          ...s,
          member: { ...s.member, profile },
          checkIns: [...s.checkIns, checkIn],
          plans: [...plans, generatePlan({ profile, cycle: (prev?.cycle ?? 0) + 1, startDate, seed: newSeed(), createdBy: mode })],
        };
      });
    },
    /** New exercise selection for the current phase, same dates and profile (or an updated profile). */
    regenerateCurrent(profile?: Profile) {
      updateActive((s) => {
        const prev = currentPlan(s);
        if (!prev || !s.member) return s;
        const p = profile ?? s.member.profile;
        const plan = generatePlan({ profile: p, cycle: prev.cycle, startDate: prev.startDate, seed: newSeed(), createdBy: "manual" });
        return { ...s, member: { ...s.member, profile: p }, plans: [...s.plans.slice(0, -1), plan] };
      });
    },
    setPhoto(photo: string | undefined) {
      updateActive((s) => (s.member ? { ...s, member: { ...s.member, photo } } : s));
    },
    toggleDay(date: string) {
      updateActive((s) => ({
        ...s,
        completedDays: s.completedDays.includes(date) ? s.completedDays.filter((d) => d !== date) : [...s.completedDays, date],
      }));
    },
    timeIn() {
      updateActive((s) =>
        !s.member || s.attendance.some((a) => !a.timeOut) ? s : { ...s, attendance: [...s.attendance, { id: uid(), timeIn: new Date().toISOString() }] },
      );
    },
    timeOut() {
      updateActive((s) => ({ ...s, attendance: s.attendance.map((a) => (a.timeOut ? a : { ...a, timeOut: new Date().toISOString() })) }));
    },
    deleteAttendance(id: string) {
      updateActive((s) => ({ ...s, attendance: s.attendance.filter((a) => a.id !== id) }));
    },
    startCali(startDate: string, round?: number, level?: Level) {
      updateActive((s) => ({
        ...s,
        cali: generateCali({
          startDate,
          level: level ?? s.cali?.level ?? s.member?.profile.level ?? "intermediate",
          round: round ?? (s.cali ? s.cali.round + 1 : 1),
          createdBy: "manual",
        }),
      }));
    },
    toggleCaliDay(day: number) {
      updateActive((s) =>
        s.cali ? { ...s, cali: { ...s.cali, completed: s.cali.completed.includes(day) ? s.cali.completed.filter((d) => d !== day) : [...s.cali.completed, day] } } : s,
      );
    },
    removeMealPlan() {
      updateActive((s) => ({ ...s, mealSeed: undefined }));
    },
    /** Add a meal plan, or get a fresh meal selection for the whole 3-month phase. */
    newMealPlan() {
      updateActive((s) => (s.member ? { ...s, mealSeed: newSeed() } : s));
    },
    setAutoAdvance(v: boolean) {
      setStore((s) => ({ ...s, autoAdvance: v }));
    },
  };

  return { store, state, ready, actions };
}

export type Actions = ReturnType<typeof useAppState>["actions"];
