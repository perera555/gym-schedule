"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "ironforge-videos-v1";
const EVT = "ironforge-videos-changed";

export type VideoSource = { kind: "youtube"; id: string } | { kind: "file"; url: string };

/** Accepts youtube.com/watch?v=, youtu.be/, /shorts/, /embed/ links, or a direct .mp4/.webm URL. */
export function parseVideo(input: string): VideoSource | null {
  const s = input.trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return /^[\w-]{11}$/.test(id) ? { kind: "youtube", id } : null;
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const v = u.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return { kind: "youtube", id: v };
      const m = u.pathname.match(/\/(shorts|embed|live)\/([\w-]{11})/);
      return m ? { kind: "youtube", id: m[2] } : null;
    }
    if (/^https?:$/.test(u.protocol) && /\.(mp4|webm|ogg|mov)$/i.test(u.pathname)) return { kind: "file", url: u.toString() };
  } catch {}
  return null;
}

export function youtubeSearchUrl(exerciseName: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${exerciseName} proper form tutorial`)}`;
}

function read(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

/** Per-exercise real video links, saved on this device and shared by every screen. */
export function useVideoLinks() {
  const [links, setLinks] = useState<Record<string, string>>({});
  useEffect(() => {
    setLinks(read());
    const sync = () => setLinks(read());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const setLink = useCallback((id: string, url: string | null) => {
    const next = read();
    if (url) next[id] = url;
    else delete next[id];
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    window.dispatchEvent(new Event(EVT));
  }, []);
  return { links, setLink };
}
