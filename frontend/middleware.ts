import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (!req.auth?.user) {
      return NextResponse.redirect(new URL(`/signin?next=${pathname}`, req.url));
    }

    if (!(req.auth.user as { isAdmin?: boolean }).isAdmin) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  if (pathname.startsWith("/artist/metrics") && !req.auth?.user) {
    return NextResponse.redirect(new URL(`/signin?next=${pathname}`, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/artist/metrics/:path*"],
};
