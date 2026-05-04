"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (installed || !prompt) return null;

  const handleInstall = async () => {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted" || outcome === "dismissed") {
      setPrompt(null);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleInstall()}
      className="flex w-full items-center justify-center gap-2 rounded-full border border-[#00e5ff]/25 bg-[#00e5ff]/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00e5ff] transition hover:border-[#00e5ff]/40 hover:bg-[#00e5ff]/15 sm:w-auto sm:text-xs sm:tracking-[0.22em]"
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 16V4" />
        <path d="M8 12l4 4 4-4" />
        <path d="M4 20h16" />
      </svg>
      Add to Home Screen
    </button>
  );
}
