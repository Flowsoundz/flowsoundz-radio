import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim() ?? "";
const MAINTENANCE = process.env.MAINTENANCE_MODE === "true";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/artist/metrics/:path*",
    "/artist/release-submit/:path*",
    "/((?!_next/static|_next/image|favicon.ico|brand/|splash/|covers/|FSRLogo).*)",
  ],
};
