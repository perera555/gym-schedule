"use client";

import { useEffect, useState } from "react";
import { Button, Modal } from "./ui";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function platform() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Macintosh/.test(ua)) return "mac";
  return "desktop";
}

/** Registers the service worker and shows an "Install app" button for Windows, Mac, Android and iPhone. */
export default function InstallApp() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);
  const [os, setOs] = useState("desktop");

  useEffect(() => {
    setOs(platform());
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  return (
    <>
      <Button
        variant="ghost"
        className="px-3 py-2"
        onClick={async () => {
          if (evt) {
            await evt.prompt();
            const r = await evt.userChoice;
            if (r.outcome === "accepted") setInstalled(true);
            setEvt(null);
          } else setHelp(true);
        }}
      >
        📲 Install app
      </Button>
      <Modal open={help} onClose={() => setHelp(false)}>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" className="h-14 w-14 rounded-2xl" />
          <div>
            <h2 className="text-xl font-black text-white">Install IronForge</h2>
            <p className="text-sm text-slate-400">Works like a native app: home-screen icon, full screen, works offline.</p>
          </div>
        </div>
        <div className="mt-5 space-y-4 text-sm text-slate-200">
          <Section title="🍎 iPhone / iPad (Safari)" active={os === "ios"}>
            Tap the <b>Share</b> button <span className="rounded bg-white/10 px-1">⬆︎</span> → scroll down → <b>Add to Home Screen</b> → <b>Add</b>.
          </Section>
          <Section title="🤖 Android (Chrome / Samsung Internet)" active={os === "android"}>
            Tap the <b>⋮ menu</b> → <b>Install app</b> (or <b>Add to Home screen</b>).
          </Section>
          <Section title="🪟 Windows (Chrome / Edge)" active={os === "desktop"}>
            Click the <b>install icon</b> <span className="rounded bg-white/10 px-1">⊕</span> at the right of the address bar, or menu <b>⋯</b> → <b>Apps</b> → <b>Install IronForge</b>. It then appears in the Start menu.
          </Section>
          <Section title="💻 Mac (Safari / Chrome)" active={os === "mac"}>
            Safari: <b>File</b> → <b>Add to Dock</b>. Chrome: install icon in the address bar.
          </Section>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={() => setHelp(false)}>Got it</Button>
        </div>
      </Modal>
    </>
  );
}

function Section({ title, active, children }: { title: string; active: boolean; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border p-3 ${active ? "border-cyan-300/50 bg-cyan-400/10" : "border-white/10 bg-white/[.03]"}`}>
      <div className="mb-1 font-bold text-white">
        {title} {active && <span className="ml-1 text-xs font-normal text-cyan-300">← your device</span>}
      </div>
      <div className="text-slate-300">{children}</div>
    </div>
  );
}
