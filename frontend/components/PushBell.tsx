"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";

type SubState = "unknown" | "unsupported" | "denied" | "subscribed" | "unsubscribed";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
  return arr.buffer as ArrayBuffer;
}

export function PushBell() {
  const [state, setState] = useState<SubState>("unknown");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      setState(existing ? "subscribed" : "unsubscribed");
    }).catch(() => setState("unsupported"));
  }, []);

  async function subscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
        ),
      });
      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
        }),
      });
      setState("subscribed");
      track("start_listening_click", {
        action: "enable_alerts",
        source: "push_bell",
      });
    } catch {
      if (Notification.permission === "denied") setState("denied");
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("unsubscribed");
      track("start_listening_click", {
        action: "disable_alerts",
        source: "push_bell",
      });
    } finally {
      setLoading(false);
    }
  }

  if (state === "unsupported" || state === "unknown") return null;

  const subscribed = state === "subscribed";
  const denied = state === "denied";

  return (
    <button
      type="button"
      onClick={denied ? undefined : subscribed ? () => void unsubscribe() : () => void subscribe()}
      disabled={loading || denied}
      title={
        denied
          ? "Notifications blocked — enable in browser settings"
          : subscribed
          ? "Notifications on — click to turn off"
          : "Get notified for new drops"
      }
      className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold transition hover:border-white/20 hover:bg-white/8 disabled:opacity-40"
    >
      {subscribed ? (
        <>
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#FF2DA6]" fill="currentColor">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span className="text-[#FF2DA6]">On</span>
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0M6.26 6.26A5.86 5.86 0 0 0 6 8"/>
          </svg>
          <span className="text-slate-400">{denied ? "Blocked" : loading ? "…" : "Notify me"}</span>
        </>
      )}
    </button>
  );
}
