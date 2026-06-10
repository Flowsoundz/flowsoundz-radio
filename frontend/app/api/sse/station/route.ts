import { getMessages } from "@/lib/chatStore";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Max lifetime per SSE connection. Vercel Pro functions max at 300s; we close
// at 55s so the client reconnects cleanly before any platform timeout fires.
const MAX_LIFETIME_MS = 55_000;
const CHAT_POLL_MS = 2_000;
const BOOST_POLL_MS = 10_000;
const HEARTBEAT_MS = 25_000;

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const timers: ReturnType<typeof setInterval>[] = [];

      function send(event: string, data: unknown) {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          closed = true;
        }
      }

      function cleanup() {
        closed = true;
        timers.forEach(clearInterval);
        try { controller.close(); } catch { /* already closed */ }
      }

      // ── Initial payload ──────────────────────────────────────────────────
      try {
        const [initMessages, initBoosts] = await Promise.all([
          getMessages(50),
          prisma.queueBoost.findMany({ select: { trackId: true, score: true }, orderBy: { score: "desc" }, take: 30 }),
        ]);
        send("init", { messages: initMessages, boosts: initBoosts });
      } catch {
        cleanup();
        return;
      }

      let lastChatAt = new Date();

      // ── Chat poll every 2s ───────────────────────────────────────────────
      timers.push(setInterval(async () => {
        if (closed) return;
        try {
          const newMessages = await getMessages(20, lastChatAt);
          if (newMessages.length > 0) {
            lastChatAt = new Date(newMessages[newMessages.length - 1]!.createdAt);
            send("chat", newMessages);
          }
        } catch { cleanup(); }
      }, CHAT_POLL_MS));

      // ── Boost scores every 10s ──────────────────────────────────────────
      timers.push(setInterval(async () => {
        if (closed) return;
        try {
          const boosts = await prisma.queueBoost.findMany({
            select: { trackId: true, score: true },
            orderBy: { score: "desc" },
            take: 30,
          });
          send("boosts", boosts);
        } catch { cleanup(); }
      }, BOOST_POLL_MS));

      // ── Heartbeat every 25s — keeps proxies from closing the connection ──
      timers.push(setInterval(() => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(": heartbeat\n\n")); }
        catch { cleanup(); }
      }, HEARTBEAT_MS));

      // ── Hard close before platform timeout ──────────────────────────────
      setTimeout(cleanup, MAX_LIFETIME_MS);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
