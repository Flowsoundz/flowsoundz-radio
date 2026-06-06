import NextAuth from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim() ?? "";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
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
    session({ session, user }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          role: (user as { role?: string }).role ?? "LISTENER",
          tier: (user as { tier?: string }).tier ?? "FREE",
          isAdmin: ADMIN_EMAIL ? user.email === ADMIN_EMAIL : false,
        },
      };
    },
  },
  events: {
    // Promote first user with admin email to ADMIN role automatically
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
