import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Comma-separated list, e.g. "flowsoundzradio@gmail.com,adonyluisflorencio@gmail.com"
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);
const MAINTENANCE = process.env.MAINTENANCE_MODE === "true";
const LAUNCH_MODE = process.env.LAUNCH_MODE === "true";
const STREAM_WINDOW_MS = 50 * 60 * 1000;
const STREAM_COOKIE = "fsr-stream-token";

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function isValidStreamToken(secret: string, token: string): Promise<boolean> {
  const now = Date.now();
  for (const offset of [0, -1]) {
    const windowId = Math.floor(now / STREAM_WINDOW_MS) + offset;
    const expected = await hmacHex(secret, `stream:${windowId}`);
    if (expected === token) return true;
  }
  return false;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Resolve session once — used by maintenance bypass, launch gate, and admin checks.
  // Auth.js v5 names the session cookie `__Secure-authjs.session-token` on HTTPS
  // and `authjs.session-token` on HTTP, and encrypts it with the cookie name as
  // the salt. getToken must be told the matching cookieName/salt/secureCookie or
  // it returns null on production — making every signed-in admin look anonymous
  // and bounce to /coming-soon. (This was the bug.)
  const useSecureCookies = req.url.startsWith("https://");
  const sessionCookieName = `${useSecureCookies ? "__Secure-" : ""}authjs.session-token`;
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: useSecureCookies,
    cookieName: sessionCookieName,
    salt: sessionCookieName,
  });
  const isAuthed = Boolean(token);
  const isAdmin = Boolean(token?.email && ADMIN_EMAILS.has(token.email.trim().toLowerCase()));

  // Audio requested by the embed radio player. Those <audio> subresource requests
  // are same-origin to the iframe document, so they carry its URL (/embed/radio)
  // as Referer. A SameSite=Strict cookie never travels into a third-party iframe,
  // so we trust this Referer for the embed (low-sensitivity anti-hotlink token)
  // and let embed audio bypass maintenance, the launch gate, and the cookie check.
  let isEmbedAudio = false;
  if (pathname.startsWith("/audio/")) {
    try {
      isEmbedAudio = new URL(req.headers.get("referer") ?? "").pathname.startsWith("/embed");
    } catch {
      /* missing or malformed Referer — treat as non-embed */
    }
  }

  // Maintenance / coming-soon mode — admin always gets through, /signin allowed so admin can log in.
  // /embed stays open (iframes on third-party sites) and embed audio streams through.
  // Legal pages must NEVER be gated: Google's OAuth consent screen requires a
  // publicly reachable privacy policy, and users on the waitlist need terms.
  if (
    MAINTENANCE &&
    !isAdmin &&
    !isEmbedAudio &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/signin") &&
    !pathname.startsWith("/embed") &&
    !pathname.startsWith("/privacy") &&
    !pathname.startsWith("/terms") &&
    !pathname.startsWith("/copyright")
  ) {
    if (pathname !== "/coming-soon") {
      return NextResponse.redirect(new URL("/coming-soon", req.url));
    }
  }

  // Launch mode: gate /radio and /audio/* behind INSIDER/VAULT tier (admin + embed bypass)
  if (LAUNCH_MODE && !isAdmin && !isEmbedAudio && (pathname.startsWith("/radio") || pathname.startsWith("/audio/"))) {
    const tier = (token as { tier?: string } | null)?.tier ?? "";
    const hasAccess = tier === "INSIDER" || tier === "VAULT";
    if (!hasAccess) {
      if (pathname.startsWith("/audio/")) {
        return new NextResponse("Early access only.", { status: 403 });
      }
      return NextResponse.redirect(new URL("/?early=1", req.url));
    }
  }

  // Protect audio files — require a valid stream token cookie (embed traffic exempt)
  if (pathname.startsWith("/audio/")) {
    if (isEmbedAudio) {
      return NextResponse.next();
    }
    const secret = process.env.AUTH_SECRET;
    if (secret) {
      const streamToken = req.cookies.get(STREAM_COOKIE)?.value ?? "";
      if (!(await isValidStreamToken(secret, streamToken))) {
        return new NextResponse("Stream access denied.", { status: 403 });
      }
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (!isAuthed) {
      return NextResponse.redirect(new URL(`/signin?next=${pathname}`, req.url));
    }

    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Lock the entire admin API surface to admins. The /admin check above doesn't
  // cover /api/admin/*, and several of those routes had weak or no per-route
  // auth — this is the single gate that closes them all. (Cron routes live
  // under /api/cron and authenticate with CRON_SECRET, so they're unaffected.)
  if (pathname.startsWith("/api/admin") && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (pathname.startsWith("/artist/metrics") && !isAuthed) {
    return NextResponse.redirect(new URL(`/signin?next=${pathname}`, req.url));
  }

  if (pathname.startsWith("/artist/submissions") && !isAuthed) {
    return NextResponse.redirect(new URL(`/signin?next=${pathname}`, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/audio/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    "/artist/metrics/:path*",
    "/artist/submissions/:path*",
    "/((?!_next/static|_next/image|favicon.ico|brand/|splash/|covers/|FSRLogo).*)",
  ],
};
