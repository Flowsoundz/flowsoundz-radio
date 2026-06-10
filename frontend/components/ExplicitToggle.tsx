"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "fsr-allow-explicit";

export function ExplicitToggle() {
  const [allowed, setAllowed] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setAllowed(stored === "true");
    } else {
      fetch("/api/user/preferences")
        .then((r) => r.json())
        .then((data: { allowExplicit?: boolean }) => {
          const val = data.allowExplicit ?? true;
          setAllowed(val);
          localStorage.setItem(STORAGE_KEY, String(val));
        })
        .catch(() => undefined);
    }
  }, []);

  async function toggle() {
    const next = !allowed;
    setAllowed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
    setSaving(true);
    try {
      await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowExplicit: next }),
      });
    } catch {
      // fire-and-forget — localStorage is the source of truth for the player
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      aria-label={allowed ? "Explicit content on — click to turn off" : "Explicit content off — click to turn on"}
      className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold transition hover:border-white/20 hover:bg-white/8 disabled:opacity-50"
    >
      <span
        className="flex h-4 w-4 items-center justify-center rounded-sm text-[9px] font-black leading-none"
        style={{
          background: allowed ? "#FF2DA6" : "rgba(255,255,255,0.12)",
          color: allowed ? "#fff" : "rgba(255,255,255,0.4)",
        }}
      >
        E
      </span>
      <span className="text-slate-300">
        {allowed ? "Explicit on" : "Explicit off"}
      </span>
    </button>
  );
}
