import { NextResponse } from "next/server";
import { appendWaitlistEntry } from "@/lib/adminWaitlistStore";
import { sendWaitlistNotification, sendWaitlistConfirmation } from "@/lib/mailer";

export const runtime = "nodejs";

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

  const entry = {
    id: `wl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    email,
    joined_at: new Date().toISOString(),
    source: "homepage",
  };

  // Check for duplicate before saving (upsert still runs but we want to return 200 vs 201)
  const { readWaitlistEntries } = await import("@/lib/adminWaitlistStore");
  const existing = await readWaitlistEntries().catch(() => []);
  const isDuplicate = existing.some((e) => e.email === email);

  if (isDuplicate) {
    return NextResponse.json(
      { message: "You're already on the list — we'll be in touch." },
      { status: 200 },
    );
  }

  void appendWaitlistEntry(entry).catch(() => undefined);
  // Notify admin and send confirmation to the user — fire and forget
  void sendWaitlistNotification(entry).catch(() => undefined);
  void sendWaitlistConfirmation(email).catch(() => undefined);

  return NextResponse.json(
    { message: "You're on the list. Welcome to FlowSoundz.", entry },
    { status: 201 },
  );
}
