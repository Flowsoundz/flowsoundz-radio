import webpush from "web-push";

// web-push's setVapidDetails() throws on an empty/invalid public key. Calling it
// at module top-level (as the routes used to) means a build with missing VAPID
// env — e.g. a fresh server-side Vercel build — crashes during "Collecting page
// data". Configure lazily instead: return the configured client, or null when
// keys are absent so callers skip sending rather than throwing.
let configured = false;

export function getWebPush(): typeof webpush | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;

  if (!configured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT ?? "mailto:flowsoundzradio@gmail.com",
      publicKey,
      privateKey,
    );
    configured = true;
  }
  return webpush;
}
