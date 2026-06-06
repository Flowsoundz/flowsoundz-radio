import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim() ?? "";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/artist/metrics/:path*"],
};
