"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type PromptState = "idle" | "android" | "ios" | "dismissed";

export function InstallPrompt() {
  const [state, setState] = useState<PromptState>("idle");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (sessionStorage.getItem("fsr-install-dismissed")) return;

    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !(navigator as { standalone?: boolean }).standalone;

    if (isIos) {
      const t = setTimeout(() => setState("ios"), 5000);
      return () => clearTimeout(t);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setState("android");
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setState("dismissed"));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    sessionStorage.setItem("fsr-install-dismissed", "1");
    setState("dismissed");
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setState("dismissed");
    else dismiss();
    setDeferredPrompt(null);
  }

  if (state === "idle" || state === "dismissed") return null;

  return (
    <div className="fixed bottom-[88px] left-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-[1.4rem] border border-white/10 bg-[#0d1120]/95 p-4 shadow-[0_8px_40px_rgba(0,0,0,0.7)] backdrop-blur-xl">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/flowsoundz-fr-appicon-dark.png"
          alt=""
          width={44}
          height={44}
          className="shrink-0 rounded-[0.8rem]"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#F8FAFC]">Install FlowSoundz Radio</p>
          {state === "ios" ? (
            <p className="mt-0.5 text-xs leading-relaxed text-[#CBD5E1]">
              Tap <strong className="text-[#F8FAFC]">Share</strong> then{" "}
              <strong className="text-[#F8FAFC]">Add to Home Screen</strong> to keep the music
              playing with your screen off.
            </p>
          ) : (
            <p className="mt-0.5 text-xs leading-relaxed text-[#CBD5E1]">
              Add to your home screen for background audio and instant access.
            </p>
          )}
          {state === "android" && (
            <button
              onClick={() => { void install(); }}
              className="mt-2.5 rounded-full bg-gradient-to-r from-[#00E5FF] via-[#8B5CF6] to-[#FF2DA6] px-4 py-1.5 text-xs font-bold text-[#050816] transition active:opacity-80"
            >
              Install
            </button>
          )}
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-full p-1 text-[#CBD5E1]/50 transition hover:text-[#F8FAFC]"
          aria-label="Dismiss"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
