import type { NextRequest } from "next/server";

export const runtime = "edge";

type Message = { role: "user" | "assistant"; content: string };

type DjChatRequest = {
  messages?: unknown;
  djName?: unknown;
  djTone?: unknown;
  vibe?: unknown;
  currentSongTitle?: unknown;
  currentSongArtist?: unknown;
};

function getString(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

// In-memory per-IP rate limit (per edge isolate — best effort, matches the
// pattern in chatStore/vote). Each request hits Anthropic, so keep it tight.
const ipLastRequestMs = new Map<string, number>();
const REQUEST_COOLDOWN_MS = 3_000;
const MAX_TRACKED_IPS = 5_000;

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const now = Date.now();
  const last = ipLastRequestMs.get(ip) ?? 0;
  if (now - last < REQUEST_COOLDOWN_MS) {
    return new Response(
      JSON.stringify({ error: "Slow down — the DJ can only talk so fast." }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "3" } },
    );
  }
  if (ipLastRequestMs.size > MAX_TRACKED_IPS) ipLastRequestMs.clear();
  ipLastRequestMs.set(ip, now);

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: DjChatRequest;
  try {
    body = (await request.json()) as DjChatRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const djName = getString(body.djName) || "Nova Calm";
  const djTone = getString(body.djTone) || "smooth, premium, discovery-first";
  const vibe = getString(body.vibe) || "chill";
  const currentSongTitle = getString(body.currentSongTitle);
  const currentSongArtist = getString(body.currentSongArtist);

  const messages: Message[] = Array.isArray(body.messages)
    ? (body.messages as unknown[])
        .filter(
          (m): m is Message =>
            typeof m === "object" &&
            m !== null &&
            "role" in m &&
            "content" in m &&
            ((m as Message).role === "user" ||
              (m as Message).role === "assistant") &&
            typeof (m as Message).content === "string",
        )
        .slice(-12)
    : [];

  if (
    messages.length === 0 ||
    messages[messages.length - 1].role !== "user"
  ) {
    return new Response(JSON.stringify({ error: "Missing user message." }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    });
  }

  const nowPlaying =
    currentSongTitle && currentSongArtist
      ? `Now playing: "${currentSongTitle}" by ${currentSongArtist}.`
      : "The station is warming up.";

  const systemPrompt = [
    `You are ${djName}, the live DJ on FlowSoundz Radio — a discovery-first station for independent artists.`,
    ``,
    `Your personality: ${djTone}.`,
    `Current vibe on air: ${vibe}.`,
    `${nowPlaying}`,
    ``,
    `Rules:`,
    `- Keep every response SHORT — 1 to 3 sentences max. You're a radio DJ, not a blogger.`,
    `- Stay in character as ${djName} at all times. Never reveal you are an AI.`,
    `- Comment on the track, hype the listener, vibe-match their energy, or suggest switching vibes.`,
    `- If someone asks about a Vault or Insider-exclusive track, naturally mention Insider membership unlocks it — no hard sell.`,
    `- No lists, no headers. Sound like real radio — short, punchy, personality-first.`,
  ].join("\n");

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      system: systemPrompt,
      messages,
      stream: true,
    }),
  });

  if (!anthropicRes.ok || !anthropicRes.body) {
    const errText = await anthropicRes.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: errText || "Anthropic request failed." }),
      {
        status: anthropicRes.status,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const encoder = new TextEncoder();
  const upstream = anthropicRes.body;

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const ev = JSON.parse(data) as {
                type?: string;
                delta?: { type?: string; text?: string };
              };
              if (
                ev.type === "content_block_delta" &&
                ev.delta?.type === "text_delta" &&
                ev.delta.text
              ) {
                controller.enqueue(encoder.encode(ev.delta.text));
              }
            } catch {}
          }
        }
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
