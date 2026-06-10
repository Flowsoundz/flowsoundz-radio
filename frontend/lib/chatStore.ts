import { prisma } from "@/lib/prisma";

export type ChatRole = "ADMIN" | "ARTIST" | "VAULT" | "INSIDER" | "LISTENER";

export type ChatMessage = {
  id: string;
  createdAt: string;
  displayName: string;
  text: string;
  trackTitle: string | null;
  role: ChatRole;
};

const MAX_MESSAGES = 200;
const RATE_LIMIT_MS = 5_000;

// In-memory rate limit only (fine for serverless — limits per instance, good enough)
const lastSentAt = new Map<string, number>();

export async function getMessages(limit = 50, since?: Date): Promise<ChatMessage[]> {
  const rows = await prisma.chatMessage.findMany({
    where: since ? { createdAt: { gt: since } } : undefined,
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    displayName: r.displayName,
    text: r.text,
    trackTitle: r.trackTitle ?? null,
    role: r.role as ChatRole,
  }));
}

export type SendResult =
  | { ok: true; message: ChatMessage }
  | { ok: false; error: string };

export async function sendMessage(input: {
  ip: string;
  displayName: string;
  text: string;
  trackTitle: string | null;
  role?: ChatRole;
}): Promise<SendResult> {
  const now = Date.now();
  const last = lastSentAt.get(input.ip) ?? 0;
  if (now - last < RATE_LIMIT_MS) {
    return { ok: false, error: "Slow down — one message every 5 seconds." };
  }

  const name = input.displayName.trim().slice(0, 32) || "Listener";
  const text = input.text.trim().slice(0, 200);
  if (!text) return { ok: false, error: "Message cannot be empty." };

  lastSentAt.set(input.ip, now);

  // Keep the table bounded
  const count = await prisma.chatMessage.count();
  if (count >= MAX_MESSAGES) {
    const oldest = await prisma.chatMessage.findMany({
      orderBy: { createdAt: "asc" },
      take: 20,
      select: { id: true },
    });
    await prisma.chatMessage.deleteMany({
      where: { id: { in: oldest.map((m) => m.id) } },
    });
  }

  const row = await prisma.chatMessage.create({
    data: {
      displayName: name,
      text,
      trackTitle: input.trackTitle?.trim().slice(0, 80) ?? null,
      role: input.role ?? "LISTENER",
      ip: input.ip,
    },
  });

  return {
    ok: true,
    message: {
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      displayName: row.displayName,
      text: row.text,
      trackTitle: row.trackTitle ?? null,
      role: row.role as ChatRole,
    },
  };
}
