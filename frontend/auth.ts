import NextAuth from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim() ?? "";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 days in cookie
  providers: [
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
        token.isAdmin = ADMIN_EMAIL ? user.email === ADMIN_EMAIL : false;
      }
      token.id ??= token.sub;
      token.role ??= "LISTENER";
      token.tier ??= "FREE";
      token.isAdmin ??= Boolean(ADMIN_EMAIL && token.email === ADMIN_EMAIL);
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
      if (ADMIN_EMAIL && user.email === ADMIN_EMAIL) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "ADMIN" },
        });
      }
    },
  },
});
