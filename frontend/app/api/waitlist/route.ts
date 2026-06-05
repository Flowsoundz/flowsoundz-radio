import { NextResponse } from "next/server";
import { sendWaitlistNotification } from "@/lib/mailer";

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
  };

  void sendWaitlistNotification(entry).catch(() => undefined);

  return NextResponse.json({
    message: "You're on the list. Welcome to FlowSoundz.",
    entry,
  });
}
