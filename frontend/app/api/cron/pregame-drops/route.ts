import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Called by Vercel cron every 30 minutes.
// Pre-generates DJ drop scripts for the top-rotated tracks so transitions
// skip the LLM call entirely and go straight to ElevenLabs TTS.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const SCRIPT_CACHE_TTL_MS = 45 * 60 * 1000;
  const cutoff = new Date(Date.now() - SCRIPT_CACHE_TTL_MS);
  const now = new Date();

  // Top 20 publicly released songs sorted by rotation score
  const topTracks = await prisma.song.findMany({
    where: {
      publicReleaseAt: { lte: now },
    },
    include: {
      artist: { select: { name: true } },
      queuePreferences: { select: { rotationScore: true } },
    },
    orderBy: { queuePreferences: { rotationScore: "desc" } },
    take: 20,
  });

  let generated = 0;
  let skipped = 0;

  for (const song of topTracks) {
    const artistName = song.artist.name;
    const vibeStr = song.vibe as string;
    const langs = ["spanglish", "en"] as const;

    for (const lang of langs) {
      // Skip if we have a fresh script
      const existing = await prisma.djDropScript.findUnique({
        where: { trackId_lang: { trackId: song.id, lang } },
      });
      if (existing && existing.generatedAt > cutoff) {
        skipped++;
        continue;
      }

      const system =
        lang === "en"
          ? "You are the host of FlowSoundz Radio. Introduce the track in 1-2 punchy sentences. No hashtags. Sound like a real DJ."
          : "You are the bilingual host of FlowSoundz Radio. Mix English and Spanish naturally. Introduce the track in 1-2 punchy sentences. No hashtags.";

      const userPrompt =
        lang === "en"
          ? `Introduce "${song.title}" by ${artistName}. Vibe: ${vibeStr}. Make it hit.`
          : `Introduce "${song.title}" by ${artistName}. Vibe: ${vibeStr}. Mix both languages — make it hit.`;

      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 100,
            system,
            messages: [{ role: "user", content: userPrompt }],
          }),
        });

        if (!res.ok) continue;

        const data = (await res.json()) as {
          content?: { type: string; text: string }[];
        };
        const script = data.content?.find((b) => b.type === "text")?.text?.trim();
        if (!script) continue;

        await prisma.djDropScript.upsert({
          where: { trackId_lang: { trackId: song.id, lang } },
          create: { trackId: song.id, lang, script },
          update: { script, generatedAt: new Date() },
        });

        generated++;
      } catch {
        // Non-fatal — move to next track
      }
    }
  }

  return NextResponse.json({ ok: true, generated, skipped });
}
