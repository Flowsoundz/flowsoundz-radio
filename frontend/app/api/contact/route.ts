import { NextResponse } from "next/server";
import { appendContactMessage } from "@/lib/adminContactStore";
import { sendContactNotification } from "@/lib/mailer";

export const runtime = "nodejs";

const VALID_TOPICS = new Set(["artist", "partnership", "general"]);

export async function POST(request: Request) {
  let topic: string, name: string, email: string, message: string;

  try {
    const body = (await request.json()) as {
      topic?: unknown;
      name?: unknown;
      email?: unknown;
      message?: unknown;
    };
    topic = typeof body.topic === "string" ? body.topic.trim() : "";
    name = typeof body.name === "string" ? body.name.trim() : "";
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    message = typeof body.message === "string" ? body.message.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 422 });
  }
  if (!email || !email.includes("@") || !email.split("@")[1]?.includes(".")) {
    return NextResponse.json(
      { error: "A valid email address is required." },
      { status: 422 },
    );
  }
  if (!message || message.length < 10) {
    return NextResponse.json(
      { error: "Message must be at least 10 characters." },
      { status: 422 },
    );
  }
  if (!VALID_TOPICS.has(topic)) {
    return NextResponse.json({ error: "Invalid topic." }, { status: 422 });
  }

  const entry = {
    id: `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    topic,
    name,
    email,
    message,
    received_at: new Date().toISOString(),
    status: "unread" as const,
  };

  void sendContactNotification(entry).catch(() => undefined);
  void appendContactMessage(entry).catch(() => undefined);

  return NextResponse.json({
    message: "Message received. We'll get back to you soon.",
    entry,
  });
}
