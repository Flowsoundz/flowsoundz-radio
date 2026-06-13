import type { NextRequest } from "next/server";
import { getMessages, sendMessage, type ChatRole } from "@/lib/chatStore";
import { auth } from "@/auth";
import type { Session } from "next-auth";
import { awardVibePoints } from "@/lib/vibePoints";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const since = request.nextUrl.searchParams.get("since");
  const sinceDate = since ? new Date(since) : undefined;
  const messages = await getMessages(50, sinceDate);
  return Response.json({ messages });
}

function resolveRole(session: Session | null): ChatRole {
  if (!session?.user) return "LISTENER";
  const u = session.user as { isAdmin?: boolean; role?: string; tier?: string };
  if (u.isAdmin) return "ADMIN";
  if (u.role === "ARTIST") return "ARTIST";
  if (u.tier === "VAULT") return "VAULT";
  if (u.tier === "INSIDER") return "INSIDER";
  return "LISTENER";
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

  const session = await auth();
  const role = resolveRole(session);

  const result = await sendMessage({
    ip,
    displayName: typeof body.displayName === "string" ? body.displayName : "",
    text: typeof body.text === "string" ? body.text : "",
    trackTitle: typeof body.trackTitle === "string" ? body.trackTitle : null,
    role,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 429 });
  }

  // Chatting earns a Vibe Point for signed-in listeners (rate-limited by the
  // 5s chat cooldown above, so it can't be farmed faster than conversation).
  if (session?.user?.id) {
    void awardVibePoints(session.user.id, "CHAT").catch(() => undefined);
  }

  return Response.json({ message: result.message });
}
