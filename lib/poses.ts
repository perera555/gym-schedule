/**
 * Keyframe poses for the 3D mannequin. All angles are in degrees.
 * Conventions (figure faces +Z):
 *  - pitch  > 0 tips the whole body forward (face-down), < 0 backward (face-up)
 *  - spine  > 0 leans the torso forward
 *  - shoulder/hip [x, z]: x < 0 swings the limb forward, z > 0 raises it out to the side
 *  - elbow  [x, z]: x < 0 bends the forearm forward, z > 0 bends it outward/up
 *  - knee   > 0 bends the shin backward
 */
export interface Pose {
  pitch: number;
  spine: number;
  spineZ: number;
  neck: number;
  ls: [number, number];
  rs: [number, number];
  le: [number, number];
  re: [number, number];
  lh: [number, number];
  rh: [number, number];
  lk: number;
  rk: number;
  lift: number;
}

export type Anchor = "floor" | "bar" | "dip";
export type Prop = "pullbar" | "dipbars" | "bench" | "dumbbells";

export interface Anim {
  anchor: Anchor;
  props: Prop[];
  frames: { pose: Pose; t: number }[];
}

type PoseInput = Partial<Omit<Pose, "ls" | "rs" | "le" | "re" | "lh" | "rh">> & {
  s?: [number, number]; // both shoulders
  e?: [number, number]; // both elbows
  h?: [number, number]; // both hips
  k?: number; // both knees
  ls?: [number, number];
  rs?: [number, number];
  le?: [number, number];
  re?: [number, number];
  lh?: [number, number];
  rh?: [number, number];
};

function P(p: PoseInput = {}): Pose {
  return {
    pitch: p.pitch ?? 0,
    spine: p.spine ?? 0,
    spineZ: p.spineZ ?? 0,
    neck: p.neck ?? 0,
    ls: p.ls ?? p.s ?? [0, 8],
    rs: p.rs ?? p.s ?? [0, 8],
    le: p.le ?? p.e ?? [0, 0],
    re: p.re ?? p.e ?? [0, 0],
    lh: p.lh ?? p.h ?? [0, 3],
    rh: p.rh ?? p.h ?? [0, 3],
    lk: p.lk ?? p.k ?? 0,
    rk: p.rk ?? p.k ?? 0,
    lift: p.lift ?? 0,
  };
}

const STAND = P();
const PLANK_TOP = P({ pitch: 66, s: [-66, 8], neck: -12 });
const PUSH_BOTTOM = P({ pitch: 80, s: [-8, 10], e: [-72, 0], neck: -20 });
const SQUAT_HANDS = P({ spine: 70, h: [-110, 4], k: 120, s: [-75, 8] });
const LYING = { pitch: -90, h: [-50, 4] as [number, number], k: 100, s: [-25, 10] as [number, number], e: [-130, 0] as [number, number] };

export const ANIMS = {
  stand: { anchor: "floor", props: [], frames: [{ pose: STAND, t: 1.5 }, { pose: P({ spine: 2 }), t: 1.5 }] },
  squat: {
    anchor: "floor",
    props: [],
    frames: [
      { pose: P({ s: [-80, 6] }), t: 0.9 },
      { pose: P({ h: [-100, 6], k: 112, spine: 35, s: [-85, 6] }), t: 0.9 },
    ],
  },
  jumpsquat: {
    anchor: "floor",
    props: [],
    frames: [
      { pose: P({ h: [-100, 6], k: 112, spine: 35, s: [10, 10] }), t: 0.45 },
      { pose: P({ lift: 0.35, s: [-160, 10] }), t: 0.35 },
      { pose: P({ s: [-40, 10] }), t: 0.3 },
    ],
  },
  pushup: { anchor: "floor", props: [], frames: [{ pose: PLANK_TOP, t: 0.8 }, { pose: PUSH_BOTTOM, t: 0.8 }] },
  plank: {
    anchor: "floor",
    props: [],
    frames: [
      { pose: P({ pitch: 78, s: [-78, 6], e: [-90, 0], neck: -10 }), t: 1.6 },
      { pose: P({ pitch: 77, spine: 2, s: [-77, 6], e: [-90, 0], neck: -14 }), t: 1.6 },
    ],
  },
  mountain: {
    anchor: "floor",
    props: [],
    frames: [
      { pose: P({ pitch: 66, s: [-66, 8], lh: [-95, 3], lk: 115, neck: -12 }), t: 0.32 },
      { pose: P({ pitch: 66, s: [-66, 8], rh: [-95, 3], rk: 115, neck: -12 }), t: 0.32 },
    ],
  },
  burpee: {
    anchor: "floor",
    props: [],
    frames: [
      { pose: STAND, t: 0.3 },
      { pose: SQUAT_HANDS, t: 0.3 },
      { pose: PLANK_TOP, t: 0.35 },
      { pose: PUSH_BOTTOM, t: 0.35 },
      { pose: PLANK_TOP, t: 0.3 },
      { pose: SQUAT_HANDS, t: 0.3 },
      { pose: P({ lift: 0.35, s: [-175, 6] }), t: 0.3 },
    ],
  },
  jumpingjack: {
    anchor: "floor",
    props: [],
    frames: [
      { pose: P({ s: [0, 6] }), t: 0.22 },
      { pose: P({ lift: 0.12, s: [0, 85], h: [0, 13] }), t: 0.14 },
      { pose: P({ s: [0, 165], h: [0, 24] }), t: 0.22 },
      { pose: P({ lift: 0.12, s: [0, 85], h: [0, 13] }), t: 0.14 },
    ],
  },
  run: {
    anchor: "floor",
    props: [],
    frames: [
      { pose: P({ spine: 8, lh: [-70, 3], lk: 90, rh: [20, 3], rk: 60, ls: [40, 8], rs: [-45, 8], e: [-90, 0], lift: 0.05 }), t: 0.3 },
      { pose: P({ spine: 8, rh: [-70, 3], rk: 90, lh: [20, 3], lk: 60, rs: [40, 8], ls: [-45, 8], e: [-90, 0], lift: 0.05 }), t: 0.3 },
    ],
  },
  lunge: {
    anchor: "floor",
    props: [],
    frames: [
      { pose: P({ s: [0, 15] }), t: 0.45 },
      { pose: P({ lh: [-85, 3], lk: 90, rh: [18, 3], rk: 100, s: [0, 15] }), t: 0.8 },
      { pose: P({ s: [0, 15] }), t: 0.45 },
      { pose: P({ rh: [-85, 3], rk: 90, lh: [18, 3], lk: 100, s: [0, 15] }), t: 0.8 },
    ],
  },
  situp: {
    anchor: "floor",
    props: [],
    frames: [
      { pose: P({ ...LYING }), t: 0.9 },
      { pose: P({ ...LYING, spine: 78, neck: 10 }), t: 0.9 },
    ],
  },
  crunch: {
    anchor: "floor",
    props: [],
    frames: [
      { pose: P({ ...LYING }), t: 0.8 },
      { pose: P({ ...LYING, spine: 32, neck: 15 }), t: 0.8 },
    ],
  },
  legraise: {
    anchor: "floor",
    props: [],
    frames: [
      { pose: P({ pitch: -90, h: [-5, 3], s: [0, 10] }), t: 1 },
      { pose: P({ pitch: -90, h: [-88, 3], s: [0, 10] }), t: 1 },
    ],
  },
  flutter: {
    anchor: "floor",
    props: [],
    frames: [
      { pose: P({ pitch: -90, spine: 18, neck: 10, lh: [-28, 3], rh: [-10, 3], s: [0, 10] }), t: 0.25 },
      { pose: P({ pitch: -90, spine: 18, neck: 10, lh: [-10, 3], rh: [-28, 3], s: [0, 10] }), t: 0.25 },
    ],
  },
  pullup: {
    anchor: "bar",
    props: ["pullbar"],
    frames: [
      { pose: P({ s: [-178, 12], h: [-8, 3], k: 25 }), t: 1 },
      { pose: P({ s: [-30, 12], e: [-140, 0], h: [-15, 3], k: 35, neck: -10 }), t: 1 },
    ],
  },
  dip: {
    anchor: "dip",
    props: ["dipbars"],
    frames: [
      { pose: P({ spine: 12, s: [-12, 6], h: [-25, 3], k: 75 }), t: 0.9 },
      { pose: P({ spine: 18, s: [78, 6], e: [-96, 0], h: [-30, 3], k: 80 }), t: 0.9 },
    ],
  },
  row: {
    anchor: "floor",
    props: ["dumbbells"],
    frames: [
      { pose: P({ spine: 60, h: [-15, 4], k: 22, s: [-60, 8] }), t: 0.9 },
      { pose: P({ spine: 60, h: [-15, 4], k: 22, s: [12, 14], e: [-72, 0] }), t: 0.9 },
    ],
  },
  deadlift: {
    anchor: "floor",
    props: ["dumbbells"],
    frames: [
      { pose: P({ s: [0, 6] }), t: 1 },
      { pose: P({ spine: 72, h: [-28, 4], k: 40, s: [-72, 6] }), t: 1.1 },
    ],
  },
  benchpress: {
    anchor: "floor",
    props: ["bench", "dumbbells"],
    frames: [
      { pose: P({ pitch: -90, h: [0, 12], k: 90, s: [-90, 10] }), t: 0.9 },
      { pose: P({ pitch: -90, h: [0, 12], k: 90, s: [-20, 45], e: [-70, 0] }), t: 0.9 },
    ],
  },
  fly: {
    anchor: "floor",
    props: ["bench", "dumbbells"],
    frames: [
      { pose: P({ pitch: -90, h: [0, 12], k: 90, s: [-90, 5], e: [-10, 0] }), t: 1 },
      { pose: P({ pitch: -90, h: [0, 12], k: 90, s: [-90, 80], e: [-18, 0] }), t: 1 },
    ],
  },
  press: {
    anchor: "floor",
    props: ["dumbbells"],
    frames: [
      { pose: P({ s: [0, 90], e: [0, 95] }), t: 0.9 },
      { pose: P({ s: [0, 172], e: [0, 0] }), t: 0.9 },
    ],
  },
  lateral: {
    anchor: "floor",
    props: ["dumbbells"],
    frames: [
      { pose: P({ s: [-5, 10], e: [-10, 0] }), t: 0.9 },
      { pose: P({ s: [-5, 85], e: [-10, 0] }), t: 0.9 },
    ],
  },
  curl: {
    anchor: "floor",
    props: ["dumbbells"],
    frames: [
      { pose: P({ s: [-4, 8] }), t: 0.9 },
      { pose: P({ s: [-10, 8], e: [-140, 0] }), t: 0.9 },
    ],
  },
  triceps: {
    anchor: "floor",
    props: ["dumbbells"],
    frames: [
      { pose: P({ s: [-170, 6], e: [-130, 0] }), t: 0.9 },
      { pose: P({ s: [-170, 6], e: [-8, 0] }), t: 0.9 },
    ],
  },
  calf: {
    anchor: "floor",
    props: ["dumbbells"],
    frames: [
      { pose: P({ s: [0, 6] }), t: 0.6 },
      { pose: P({ s: [0, 6], lift: 0.08 }), t: 0.6 },
    ],
  },
  stretch: {
    anchor: "floor",
    props: [],
    frames: [
      { pose: P({ s: [-175, 6] }), t: 1.6 },
      { pose: P({ s: [-175, 6], spineZ: 22 }), t: 1.6 },
      { pose: P({ s: [-175, 6], spineZ: -22 }), t: 1.6 },
      { pose: P({ spine: 95, h: [-20, 3], s: [-95, 6], neck: 20 }), t: 1.8 },
    ],
  },
} satisfies Record<string, Anim>;

export type AnimName = keyof typeof ANIMS;

const smooth = (x: number) => x * x * (3 - 2 * x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp2 = (a: [number, number], b: [number, number], t: number): [number, number] => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

export function samplePose(anim: Anim, time: number): Pose {
  const total = anim.frames.reduce((s, f) => s + f.t, 0);
  let t = ((time % total) + total) % total;
  let i = 0;
  while (t > anim.frames[i].t) {
    t -= anim.frames[i].t;
    i++;
  }
  const a = anim.frames[i].pose;
  const b = anim.frames[(i + 1) % anim.frames.length].pose;
  const k = smooth(t / anim.frames[i].t);
  return {
    pitch: lerp(a.pitch, b.pitch, k),
    spine: lerp(a.spine, b.spine, k),
    spineZ: lerp(a.spineZ, b.spineZ, k),
    neck: lerp(a.neck, b.neck, k),
    ls: lerp2(a.ls, b.ls, k),
    rs: lerp2(a.rs, b.rs, k),
    le: lerp2(a.le, b.le, k),
    re: lerp2(a.re, b.re, k),
    lh: lerp2(a.lh, b.lh, k),
    rh: lerp2(a.rh, b.rh, k),
    lk: lerp(a.lk, b.lk, k),
    rk: lerp(a.rk, b.rk, k),
    lift: lerp(a.lift, b.lift, k),
  };
}
