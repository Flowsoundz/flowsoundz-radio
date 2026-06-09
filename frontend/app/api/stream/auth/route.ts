import { createHmac } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 50 * 60 * 1000; // 50-minute rotating window
const COOKIE_MAX_AGE = 55 * 60; // 55-min cookie (overlap keeps streams alive through rotation)
const COOKIE_NAME = "fsr-stream-token";

export function buildStreamToken(secret: string): string {
  const windowId = Math.floor(Date.now() / WINDOW_MS);
  return createHmac("sha256", secret).update(`stream:${windowId}`).digest("hex");
}

export function isValidStreamToken(secret: string, token: string): boolean {
  const now = Date.now();
  for (const offset of [0, -1]) {
    const windowId = Math.floor(now / WINDOW_MS) + offset;
    const expected = createHmac("sha256", secret).update(`stream:${windowId}`).digest("hex");
    if (expected === token) return true;
  }
  return false;
}

// Issues (or refreshes) the stream access cookie. Open to any visitor — the
// cookie just proves the request came through the site, blocking direct URL scrapers.
export async function GET() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return new Response("Server misconfiguration.", { status: 500 });
  }

  const token = buildStreamToken(secret);
  const isProd = process.env.NODE_ENV === "production";

  const cookieHeader = [
    `${COOKIE_NAME}=${token}`,
    "Path=/audio",
    `Max-Age=${COOKIE_MAX_AGE}`,
    "HttpOnly",
    "SameSite=Strict",
    isProd ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": cookieHeader },
  });
}
