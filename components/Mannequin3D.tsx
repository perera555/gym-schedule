"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ANIMS, samplePose, type Anim, type AnimName, type Pose } from "@/lib/poses";

const D = THREE.MathUtils.degToRad;
const BAR_Y = 2.35;
const DIP_Y = 1.2;

interface Props {
  anim: AnimName;
  paused?: boolean;
  speed?: number;
  autoRotate?: boolean;
  accent?: string;
  className?: string;
  interactive?: boolean;
}

function limb(len: number, r: number, mat: THREE.Material) {
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.01, len - r * 2), 8, 16), mat);
  mesh.position.y = -len / 2;
  mesh.castShadow = true;
  g.add(mesh);
  const end = new THREE.Group();
  end.position.y = -len;
  g.add(end);
  return { g, end };
}

function dumbbell(mat: THREE.Material, plate: THREE.Material) {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 12), mat);
  handle.rotation.z = Math.PI / 2;
  g.add(handle);
  for (const x of [-0.1, 0.1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 20), plate);
    p.rotation.z = Math.PI / 2;
    p.position.x = x;
    p.castShadow = true;
    g.add(p);
  }
  return g;
}

function buildFigure(accent: string) {
  const skin = new THREE.MeshPhysicalMaterial({ color: 0xe8edf5, roughness: 0.35, metalness: 0.1, clearcoat: 0.6 });
  const suit = new THREE.MeshPhysicalMaterial({ color: accent, roughness: 0.4, metalness: 0.2, clearcoat: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c2333, roughness: 0.6 });

  const root = new THREE.Group();
  const pelvis = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.12, 8, 16), dark);
  pelvis.rotation.z = Math.PI / 2;
  pelvis.castShadow = true;
  root.add(pelvis);

  const spine = new THREE.Group();
  spine.position.y = 0.05;
  root.add(spine);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.26, 8, 20), suit);
  torso.position.y = 0.28;
  torso.scale.set(1.1, 1, 0.75);
  torso.castShadow = true;
  spine.add(torso);

  const neck = new THREE.Group();
  neck.position.y = 0.56;
  spine.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 24), skin);
  head.position.y = 0.13;
  head.castShadow = true;
  neck.add(head);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.05), new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.6 }));
  visor.position.set(0, 0.15, 0.09);
  neck.add(visor);

  const mk = (side: 1 | -1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(0.22 * side, 0.48, 0);
    spine.add(shoulder);
    const upper = limb(0.3, 0.055, skin);
    shoulder.add(upper.g);
    const elbow = new THREE.Group();
    upper.end.add(elbow);
    const fore = limb(0.27, 0.047, skin);
    elbow.add(fore.g);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), skin);
    hand.position.y = -0.02;
    fore.end.add(hand);
    const db = dumbbell(dark, suit);
    db.position.y = -0.03;
    fore.end.add(db);

    const hip = new THREE.Group();
    hip.position.set(0.1 * side, -0.05, 0);
    root.add(hip);
    const thigh = limb(0.44, 0.075, dark);
    hip.add(thigh.g);
    const knee = new THREE.Group();
    thigh.end.add(knee);
    const shin = limb(0.43, 0.06, skin);
    knee.add(shin.g);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.2), suit);
    foot.position.set(0, -0.01, 0.05);
    foot.castShadow = true;
    shin.end.add(foot);
    return { shoulder, elbow, hand: fore.end, hip, knee, foot: shin.end, db, kneeMark: thigh.end, elbowMark: upper.end };
  };
  const L = mk(1);
  const R = mk(-1);
  return { root, spine, neck, head, L, R };
}

type Figure = ReturnType<typeof buildFigure>;

function applyPose(f: Figure, p: Pose) {
  f.root.rotation.set(D(p.pitch), 0, 0);
  f.root.position.set(0, 0, 0);
  f.spine.rotation.set(D(p.spine), 0, D(p.spineZ));
  f.neck.rotation.set(D(p.neck), 0, 0);
  f.L.shoulder.rotation.set(D(p.ls[0]), 0, D(p.ls[1]));
  f.R.shoulder.rotation.set(D(p.rs[0]), 0, -D(p.rs[1]));
  f.L.elbow.rotation.set(D(p.le[0]), 0, D(p.le[1]));
  f.R.elbow.rotation.set(D(p.re[0]), 0, -D(p.re[1]));
  f.L.hip.rotation.set(D(p.lh[0]), 0, D(p.lh[1]));
  f.R.hip.rotation.set(D(p.rh[0]), 0, -D(p.rh[1]));
  f.L.knee.rotation.set(D(p.lk), 0, 0);
  f.R.knee.rotation.set(D(p.rk), 0, 0);
}

const tmp = new THREE.Vector3();
function worldY(o: THREE.Object3D) {
  return o.getWorldPosition(tmp).y;
}

function anchorFigure(f: Figure, anim: Anim, p: Pose) {
  f.root.updateMatrixWorld(true);
  if (anim.anchor === "floor") {
    const pts: [THREE.Object3D, number][] = [
      [f.L.foot, 0.04], [f.R.foot, 0.04], [f.L.hand, 0.05], [f.R.hand, 0.05],
      [f.head, 0.11], [f.root, 0.13], [f.L.kneeMark, 0.07], [f.R.kneeMark, 0.07],
      [f.L.elbowMark, 0.05], [f.R.elbowMark, 0.05], [f.spine, 0.16], [f.neck, 0.12],
    ];
    let min = Infinity;
    for (const [o, r] of pts) min = Math.min(min, worldY(o) - r);
    // dumbbells shouldn't sink into the floor
    if (anim.props.includes("dumbbells")) for (const h of [f.L.hand, f.R.hand]) min = Math.min(min, worldY(h) - 0.07);
    f.root.position.y = -min + p.lift;
  } else {
    const target = anim.anchor === "bar" ? BAR_Y : DIP_Y;
    const a = f.L.hand.getWorldPosition(new THREE.Vector3());
    const b = f.R.hand.getWorldPosition(new THREE.Vector3());
    f.root.position.y = target - (a.y + b.y) / 2;
    f.root.position.z = -(a.z + b.z) / 2;
  }
  f.root.updateMatrixWorld(true);
}

export default function Mannequin3D({ anim, paused = false, speed = 1, autoRotate = false, accent = "#22d3ee", className, interactive = true }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const state = useRef({ anim, paused, speed, autoRotate });
  useEffect(() => {
    state.current = { anim, paused, speed, autoRotate };
  }, [anim, paused, speed, autoRotate]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x070b14, 7, 16);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
    camera.position.set(3.1, 1.9, 3.6);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.85, 0);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = interactive;
    controls.enableRotate = interactive;
    controls.minDistance = 2.5;
    controls.maxDistance = 9;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.autoRotateSpeed = 1.2;

    scene.add(new THREE.HemisphereLight(0x9ecbff, 0x10131c, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(3, 6, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -3;
    key.shadow.camera.right = 3;
    key.shadow.camera.top = 3;
    key.shadow.camera.bottom = -3;
    scene.add(key);
    const rim = new THREE.PointLight(accent, 6, 10);
    rim.position.set(-2.5, 2.5, -2);
    scene.add(rim);
    const rim2 = new THREE.PointLight(0xf97316, 4, 10);
    rim2.position.set(2.5, 1, -2.5);
    scene.add(rim2);

    // platform
    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 2.5, 0.12, 64),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5, metalness: 0.4 }),
    );
    floor.position.y = -0.06;
    floor.receiveShadow = true;
    scene.add(floor);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.42, 0.02, 8, 96), new THREE.MeshBasicMaterial({ color: accent }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.001;
    scene.add(ring);
    const grid = new THREE.GridHelper(4.6, 18, accent, 0x1f2a3d);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.25;
    grid.position.y = 0.002;
    scene.add(grid);

    // props
    const steel = new THREE.MeshStandardMaterial({ color: 0x9aa5b8, metalness: 0.9, roughness: 0.25 });
    const pullbar = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.4, 16), steel);
    bar.rotation.z = Math.PI / 2;
    bar.position.y = BAR_Y + 0.04;
    pullbar.add(bar);
    for (const x of [-0.7, 0.7]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, BAR_Y + 0.1, 12), steel);
      post.position.set(x, (BAR_Y + 0.1) / 2, 0);
      post.castShadow = true;
      pullbar.add(post);
    }
    scene.add(pullbar);

    const dipbars = new THREE.Group();
    for (const x of [-0.3, 0.3]) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 16), steel);
      rail.rotation.x = Math.PI / 2;
      rail.position.set(x, DIP_Y - 0.04, 0);
      dipbars.add(rail);
      for (const z of [-0.5, 0.5]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, DIP_Y, 12), steel);
        post.position.set(x * 1.15, DIP_Y / 2, z);
        post.castShadow = true;
        dipbars.add(post);
      }
    }
    scene.add(dipbars);

    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 1.2), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 }));
    bench.castShadow = true;
    bench.receiveShadow = true;
    scene.add(bench);

    const fig = buildFigure(accent);
    scene.add(fig.root);

    const resize = () => {
      const w = el.clientWidth || 300;
      const h = el.clientHeight || 300;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let t = 0;
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = state.current;
      if (!s.paused) t += dt * s.speed;
      const a = ANIMS[s.anim] as Anim;
      const pose = samplePose(a, t);
      applyPose(fig, pose);
      anchorFigure(fig, a, pose);

      pullbar.visible = a.props.includes("pullbar");
      dipbars.visible = a.props.includes("dipbars");
      bench.visible = a.props.includes("bench");
      fig.L.db.visible = fig.R.db.visible = a.props.includes("dumbbells");
      if (bench.visible) {
        bench.position.set(0, fig.root.position.y - 0.2, fig.root.position.z - 0.35);
      }

      controls.autoRotate = s.autoRotate;
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const m = o.material;
          (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [accent, interactive]);

  return <div ref={host} className={className ?? "h-full w-full"} />;
}
