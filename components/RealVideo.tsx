"use client";

import { useState } from "react";
import { getExercise } from "@/lib/exercises";
import { parseVideo, useVideoLinks, youtubeSearchUrl } from "@/lib/videos";
import type { AnimName } from "@/lib/poses";
import Mannequin3D from "./Mannequin3D";
import { Button, cx, inputCls } from "./ui";

/** Plays the saved real video for an exercise, or lets the user find and attach one. */
export function RealVideo({ exerciseId, className }: { exerciseId: string; className?: string }) {
  const ex = getExercise(exerciseId);
  const { links, setLink } = useVideoLinks();
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(false);
  const src = links[exerciseId] ? parseVideo(links[exerciseId]) : null;

  if (src && !editing) {
    return (
      <div className={cx("relative overflow-hidden rounded-2xl border border-white/10 bg-black", className)}>
        {src.kind === "youtube" ? (
          <iframe
            key={src.id}
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${src.id}?autoplay=1&mute=1&loop=1&playlist=${src.id}&rel=0&modestbranding=1&playsinline=1`}
            title={`${ex.name} video`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <video key={src.url} className="h-full w-full object-contain" src={src.url} autoPlay muted loop playsInline controls />
        )}
        <button
          onClick={() => {
            setDraft(links[exerciseId]);
            setEditing(true);
          }}
          className="absolute left-2 top-2 rounded-full bg-black/70 px-2.5 py-1 text-[11px] text-slate-200 hover:bg-black"
        >
          ✎ change video
        </button>
      </div>
    );
  }

  return (
    <div className={cx("flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-black/40 p-5 text-center", className)}>
      <div className="text-4xl">🎬</div>
      <div className="font-bold text-white">Real video · {ex.name}</div>
      <p className="max-w-sm text-xs text-slate-400">Find a real form video, copy its link, and paste it here. It will be saved for this exercise and play in every workout.</p>
      <a
        href={youtubeSearchUrl(ex.name)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn3d rounded-xl bg-linear-to-b from-rose-500 to-red-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_5px_0_#7f1d1d]"
      >
        ▶ Find on YouTube
      </a>
      <form
        className="flex w-full max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!parseVideo(draft)) return setErr("Paste a YouTube link (watch, youtu.be or shorts) or a direct .mp4 link");
          setErr("");
          setLink(exerciseId, draft.trim());
          setEditing(false);
        }}
      >
        <input className={inputCls} placeholder="https://youtu.be/…" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <Button type="submit">Save</Button>
      </form>
      {err && <div className="text-xs text-rose-300">{err}</div>}
      {editing && (
        <div className="flex gap-3 text-xs">
          <button className="text-slate-400 hover:text-white" onClick={() => setEditing(false)}>
            cancel
          </button>
          <button
            className="text-rose-300 hover:text-rose-200"
            onClick={() => {
              setLink(exerciseId, null);
              setDraft("");
              setEditing(false);
            }}
          >
            remove video
          </button>
        </div>
      )}
    </div>
  );
}

/** 3D animation / real video switch used by the demo modal and the workout player. */
export function DemoStage({
  exerciseId,
  anim,
  mode,
  onMode,
  paused,
  speed,
  accent,
  autoRotate,
  className,
  children,
}: {
  exerciseId: string;
  anim: AnimName;
  mode: "3d" | "video";
  onMode: (m: "3d" | "video") => void;
  paused?: boolean;
  speed?: number;
  accent?: string;
  autoRotate?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const { links } = useVideoLinks();
  const has = !!links[exerciseId];
  return (
    <div className={cx("relative", className)}>
      {mode === "video" ? (
        <RealVideo exerciseId={exerciseId} className="h-full w-full" />
      ) : (
        <div className="stage relative h-full w-full overflow-hidden rounded-2xl border border-white/10">
          <Mannequin3D anim={anim} paused={paused} speed={speed} accent={accent} autoRotate={autoRotate} />
          {children}
        </div>
      )}
      <div className="absolute right-3 top-3 z-10 flex overflow-hidden rounded-full border border-white/15 bg-black/70 text-xs font-semibold backdrop-blur">
        {(["3d", "video"] as const).map((m) => (
          <button key={m} onClick={() => onMode(m)} className={cx("px-3 py-1.5 transition", mode === m ? "bg-cyan-400 text-slate-950" : "text-slate-300 hover:text-white")}>
            {m === "3d" ? "3D" : `Real video${has ? " ●" : ""}`}
          </button>
        ))}
      </div>
    </div>
  );
}
