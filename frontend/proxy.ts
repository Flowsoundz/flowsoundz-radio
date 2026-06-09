import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim() ?? "";
const MAINTENANCE = process.env.MAINTENANCE_MODE === "true";
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

  // Protect audio files — require a valid stream token cookie
  if (pathname.startsWith("/audio/")) {
    const secret = process.env.AUTH_SECRET;
    if (secret) {
      const token = req.cookies.get(STREAM_COOKIE)?.value ?? "";
      if (!(await isValidStreamToken(secret, token))) {
        return new NextResponse("Stream access denied.", { status: 403 });
      }
    }
    return NextResponse.next();
  }

  // Maintenance gate — allow admin and API through so Vercel deploy hooks still work
  if (MAINTENANCE && !pathname.startsWith("/admin") && !pathname.startsWith("/api")) {
    if (pathname !== "/coming-soon") {
      return NextResponse.redirect(new URL("/coming-soon", req.url));
    }
  }

  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const isAuthed = Boolean(token);
  const isAdmin = ADMIN_EMAIL ? token?.email === ADMIN_EMAIL : false;

  if (pathname.startsWith("/admin")) {
    if (!isAuthed) {
      return NextResponse.redirect(new URL(`/signin?next=${pathname}`, req.url));
    }

    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  if (pathname.startsWith("/artist/metrics") && !isAuthed) {
    return NextResponse.redirect(new URL(`/signin?next=${pathname}`, req.url));
  }

  if (pathname.startsWith("/artist/release-submit") && !isAuthed) {
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
    "/artist/metrics/:path*",
    "/artist/release-submit/:path*",
    "/artist/submissions/:path*",
    "/((?!_next/static|_next/image|favicon.ico|brand/|splash/|covers/|FSRLogo).*)",
  ],
};
