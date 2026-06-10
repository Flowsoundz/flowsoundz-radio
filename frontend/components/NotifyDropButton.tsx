"use client";

import { useEffect, useState } from "react";

type Props = {
  songId: string;
  songTitle: string;
};

type State = "idle" | "loading" | "registered" | "denied" | "unsupported";

export function NotifyDropButton({ songId, songTitle }: Props) {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    // Check if already registered for this drop
    navigator.serviceWorker.ready
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        if (!sub) { setState("idle"); return; }

        const res = await fetch(`/api/drops/notify?songId=${songId}&endpoint=${encodeURIComponent(sub.endpoint)}`);
        const d = (await res.json()) as { registered?: boolean };
        setState(d.registered ? "registered" : "idle");
      })
      .catch(() => setState("idle"));
  }, [songId]);

  async function subscribe() {
    if (state === "loading" || state === "registered") return;
    setState("loading");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setState("denied"); return; }

      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey
            ? Uint8Array.from(atob(vapidKey.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))
            : undefined,
        });
      }

      const json = sub.toJSON();
      await fetch("/api/drops/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songId,
          subscription: {
            endpoint: json.endpoint,
            keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
          },
        }),
      });

      setState("registered");
    } catch {
      setState("idle");
    }
  }

  if (state === "unsupported") return null;

  if (state === "registered") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Notified when live
      </span>
    );
  }

  if (state === "denied") {
    return (
      <span className="text-[11px] text-slate-500">Enable notifications to get alerted</span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void subscribe()}
      disabled={state === "loading"}
      title={`Notify me when "${songTitle}" drops`}
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/[0.07] px-3 py-1.5 text-[11px] font-semibold text-amber-200 transition disabled:opacity-50 hover:border-amber-400/40 hover:bg-amber-400/12"
    >
      {state === "loading" ? (
        <span className="h-3 w-3 animate-spin rounded-full border border-amber-400/40 border-t-amber-400" />
      ) : (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      )}
      Notify Me
    </button>
  );
}
