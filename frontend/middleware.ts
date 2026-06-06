import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const DB_CONFIGURED = Boolean(process.env.DATABASE_URL?.trim());
const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim() ?? "";

export async function middleware(req: NextRequest) {
  if (!DB_CONFIGURED) return NextResponse.next();

  const { pathname } = req.nextUrl;

  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const isAuthed = Boolean(token);
  const isAdmin = ADMIN_EMAIL ? token?.email === ADMIN_EMAIL : false;

  if (pathname.startsWith("/admin")) {
    if (!isAuthed) return NextResponse.redirect(new URL(`/signin?next=${pathname}`, req.url));
    if (!isAdmin) return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname.startsWith("/artist/metrics")) {
    if (!isAuthed) return NextResponse.redirect(new URL(`/signin?next=${pathname}`, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/artist/metrics/:path*"],
};
