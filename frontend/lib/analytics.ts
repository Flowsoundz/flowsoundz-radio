type EventName =
  | "page_view"
  | "start_listening_click"
  | "submission_click"
  | "share_track_click"
  | "waitlist_signup"
  | "promo_submit_click";

type EventProps = Record<string, string | number | boolean | null>;

export function track(event: EventName, props?: EventProps): void {
  if (typeof window === "undefined") return;

  const payload = {
    event,
    url: window.location.pathname,
    ts: new Date().toISOString(),
    ...props,
  };

  // Console log in dev; swap this line for any real provider later.
  if (process.env.NODE_ENV !== "production") {
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
}
