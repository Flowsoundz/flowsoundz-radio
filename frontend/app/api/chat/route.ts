import type { NextRequest } from "next/server";
import { getMessages, sendMessage } from "@/lib/chatStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ messages: getMessages(50) });
}

export async function POST(request: NextRequest) {
  let body: { displayName?: unknown; text?: unknown; trackTitle?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const result = sendMessage({
    ip,
    displayName: typeof body.displayName === "string" ? body.displayName : "",
    text: typeof body.text === "string" ? body.text : "",
    trackTitle: typeof body.trackTitle === "string" ? body.trackTitle : null,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 429 });
  }

  return Response.json({ message: result.message });
}
