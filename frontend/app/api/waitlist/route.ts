import { NextResponse } from "next/server";
import { sendWaitlistNotification } from "@/lib/mailer";

export const runtime = "nodejs";
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

type WaitlistEntry = {
  id: string;
  email: string;
};

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

  const response = await fetch(`${API_BASE}/waitlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ email }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    detail?: string;
    error?: string;
    message?: string;
    entry?: WaitlistEntry;
    already_exists?: boolean;
  };

  if (!response.ok) {
    return NextResponse.json(
      {
        error:
          payload.detail || payload.error || "Unable to join the waitlist.",
      },
      { status: response.status },
    );
  }

  if (payload.entry && !payload.already_exists) {
    void sendWaitlistNotification(payload.entry).catch(() => undefined);
  }

  return NextResponse.json(
    { message: payload.message || "You're on the list. Welcome to FlowSoundz." },
    { status: response.status },
  );
}
