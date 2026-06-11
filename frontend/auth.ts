import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

// On Vercel, honor the active request host/alias for magic-link auth.
// A stale AUTH_URL/NEXTAUTH_URL can pin callbacks to the wrong domain,
// which makes the session cookie appear to "not stick" across the site.
if (process.env.VERCEL === "1") {
  delete process.env.AUTH_URL;
  delete process.env.NEXTAUTH_URL;
  delete process.env.NEXTAUTH_URL_INTERNAL;
}

// Comma-separated list, e.g. "flowsoundzradio@gmail.com,adonyluisflorencio@gmail.com"
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

function isAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email && ADMIN_EMAILS.has(email.trim().toLowerCase()));
}
const GOOGLE_ENABLED = Boolean(
  (process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID)?.trim() &&
  (process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET)?.trim(),
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 days in cookie
  providers: [
    ...(GOOGLE_ENABLED
      ? [
          Google({
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Nodemailer({
      server: {
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      },
      from: `FlowSoundz Radio <${process.env.GMAIL_USER ?? "noreply@flowsoundzradio.com"}>`,
    }),
  ],
  pages: {
    signIn: "/signin",
    verifyRequest: "/signin/verify",
    error: "/signin",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "LISTENER";
        token.tier = (user as { tier?: string }).tier ?? "FREE";
        token.isAdmin = isAdminEmail(user.email);
      }
      token.id ??= token.sub;
      token.role ??= "LISTENER";
      token.tier ??= "FREE";
      // Always recompute from the CURRENT ADMIN_EMAIL list so changing the env
      // var promotes existing sessions on the next request — no sign-out needed.
      // (Previously `??=` left a stale isAdmin:false baked into the cookie.)
      token.isAdmin = isAdminEmail((user?.email ?? token.email) as string | null | undefined);
      return token;
    },
    session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
          tier: token.tier as string,
          isAdmin: token.isAdmin as boolean,
        },
      };
    },
  },
  events: {
    async createUser({ user }) {
      if (isAdminEmail(user.email)) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "ADMIN" },
        });
      }
    },
  },
});
