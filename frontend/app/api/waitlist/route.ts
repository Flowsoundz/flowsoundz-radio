import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appendWaitlistEntry } from "@/lib/adminWaitlistStore";
import {
  sendWaitlistNotification,
  sendWaitlistConfirmation,
  sendFoundingMemberEmail,
} from "@/lib/mailer";

export const runtime = "nodejs";

// How many early-access spots to give out (set LAUNCH_LIMIT env var to override)
const LAUNCH_LIMIT = Number(process.env.LAUNCH_LIMIT ?? 50);

export async function POST(request: Request) {
  let email: string;
  try {
    const body = (await request.json()) as { email?: unknown };
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!email || !email.includes("@") || !email.split("@")[1]?.includes(".")) {
    return NextResponse.json(
      { error: "A valid email address is required." },
      { status: 422 },
    );
  }

  // Check for duplicate
  const existing = await prisma.waitlistEntry.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { message: "You're already on the list — we'll be in touch." },
      { status: 200 },
    );
  }

  // Count how many early-access spots are taken
  const earlyCount = await prisma.waitlistEntry.count({ where: { earlyAccess: true } });
  const isEarlyAccess = earlyCount < LAUNCH_LIMIT;

  // Save to waitlist
  await prisma.waitlistEntry.create({
    data: { email, source: "homepage", earlyAccess: isEarlyAccess },
  });

  // Also append to file store (used by admin panel)
  void appendWaitlistEntry({
    id: `wl_${Date.now().toString(36)}`,
    email,
    joined_at: new Date().toISOString(),
    source: "homepage",
  }).catch(() => undefined);

  if (isEarlyAccess) {
    // Pre-create / upgrade user to INSIDER so they have access the moment they sign in
    await prisma.user.upsert({
      where: { email },
      create: { email, tier: "INSIDER", name: email.split("@")[0] },
      update: { tier: "INSIDER" },
    });

    void sendFoundingMemberEmail(email, earlyCount + 1).catch(() => undefined);
    void sendWaitlistNotification({ id: "", email }).catch(() => undefined);

    return NextResponse.json(
      { message: "You're in. Check your email for early access.", earlyAccess: true },
      { status: 201 },
    );
  }

  void sendWaitlistNotification({ id: "", email }).catch(() => undefined);
  void sendWaitlistConfirmation(email).catch(() => undefined);

  return NextResponse.json(
    { message: "You're on the list. We'll notify you when access opens.", earlyAccess: false },
    { status: 201 },
  );
}
