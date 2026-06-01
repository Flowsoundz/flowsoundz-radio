type EventName =
  | "page_view"
  | "start_listening_click"
  | "submission_click"
  | "share_track_click"
  | "waitlist_signup"
  | "promo_submit_click"
  | "track_skip"
  | "track_complete"
  | "visualizer_open"
  | "artist_submission_started"
  | "artist_submission_completed";

type EventProps = Record<string, string | number | boolean | null>;

export function track(event: EventName, props?: EventProps): void {
  if (typeof window === "undefined") return;

  const payload = {
    event,
    url: window.location.pathname,
    ts: new Date().toISOString(),
    ...props,
  };

  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_RADIO_DEBUG === "1"
  ) {
    console.log("[analytics]", payload);
  }

  // Persist lightweight event log in sessionStorage for debugging.
  try {
    const key = "fsr_events";
    const existing = JSON.parse(sessionStorage.getItem(key) ?? "[]") as unknown[];
    existing.push(payload);
    sessionStorage.setItem(key, JSON.stringify(existing.slice(-50)));
  } catch {
    // Storage quota or private mode — silently skip.
  }

  try {
    const body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/analytics", blob);
      return;
    }

    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Ignore local analytics transport failures.
  }
}
