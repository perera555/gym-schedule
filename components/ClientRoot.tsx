"use client";

import dynamic from "next/dynamic";

// The app keeps all data in localStorage and renders WebGL, so it only runs in the browser.
const App = dynamic(() => import("./App"), {
  ssr: false,
  loading: () => <div className="grid flex-1 place-items-center text-slate-400">Loading IronForge…</div>,
});

export default function ClientRoot({ section = "gym" }: { section?: "gym" | "military" | "admin" }) {
  return <App section={section} />;
}
