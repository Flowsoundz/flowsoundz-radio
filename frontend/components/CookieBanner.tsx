"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "fsz-cookie-ok";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {}
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-[72px] left-0 right-0 z-40 flex justify-center px-4 pb-3 sm:bottom-4">
      <div className="flex w-full max-w-xl items-center justify-between gap-4 rounded-[1.4rem] border border-white/10 bg-[#07111f]/95 px-5 py-3.5 shadow-[0_8px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <p className="text-xs leading-5 text-slate-400">
          We use session cookies for sign-in and radio playback. No ad tracking.{" "}
          <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
            Privacy policy
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-full bg-white/8 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-white/14"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
