import { NextResponse } from "next/server";
import { sendContactNotification } from "@/lib/mailer";

export const runtime = "nodejs";
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

const VALID_TOPICS = new Set(["artist", "partnership", "general"]);

type ContactMessage = {
  id: string;
  topic: string;
  name: string;
  email: string;
  message: string;
  received_at: string;
  status: "unread" | "read";
};

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

  const response = await fetch(`${API_BASE}/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ topic, name, email, message }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    detail?: string;
    error?: string;
    message?: string;
    entry?: ContactMessage;
  };

  if (!response.ok) {
    return NextResponse.json(
      { error: payload.detail || payload.error || "Unable to send message." },
      { status: response.status },
    );
  }

  if (payload.entry) {
    void sendContactNotification(payload.entry).catch(() => undefined);
  }

  return NextResponse.json(
    { message: payload.message || "Message received. We'll get back to you soon." },
    { status: response.status },
  );
}
