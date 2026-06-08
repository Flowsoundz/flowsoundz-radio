import type { NextRequest } from "next/server";
import { getRadioContext } from "@/lib/radioContext";

export const runtime = "nodejs";

const VOICE_ID = "ZdLBnnnCu702bKpWMoSC"; // female host
const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

type SmartNarrateRequest = {
  currentSongTitle?: string;
  currentSongArtist?: string;
  nextSongTitle?: string;
  nextSongArtist?: string;
  vibe?: string;
};

function buildDjScript(
  context: Awaited<ReturnType<typeof getRadioContext>>,
  currentTitle: string,
  currentArtist: string,
  nextTitle: string,
  nextArtist: string,
  vibe: string,
): string {
  const { timeLabel, dayOfWeek, isWeekend, weatherDesc, tempF, weatherCondition } = context;
  const tempStr = tempF !== null ? `, ${Math.round(tempF)}°F` : "";
  const dayStr = isWeekend ? `${dayOfWeek} night` : dayOfWeek;
  const weatherNote =
    weatherCondition === "rainy" || weatherCondition === "stormy"
      ? `${weatherDesc} night in Orlando${tempStr}`
      : weatherCondition === "clear" && (context.hour >= 22 || context.hour < 4)
        ? `clear night out there${tempStr}`
        : null;

  return [
    `You are the on-air host for FlowSoundz Radio — a modern Latin urban station out of Orlando, FL.`,
    `Your voice is warm, unhurried, and real. You talk like a person, not a promo.`,
    ``,
    `Right now:`,
    `- ${dayStr}, ${timeLabel}`,
    weatherNote ? `- Outside: ${weatherNote}` : null,
    `- That was: "${currentTitle}" by ${currentArtist}`,
    `- Coming up: "${nextTitle}" by ${nextArtist}`,
    `- Vibe: ${vibe}`,
    ``,
    `Write ONE transition line a real radio host would actually say out loud. Examples of the right tone:`,
    `"That one never gets old. Keep it here — FlowSoundz."`,
    `"Rainy night, good records. That's all you need."`,
    `"It's past midnight and we're just getting started."`,
    `"FlowSoundz Radio. We got you."`,
    ``,
    `Rules:`,
    `- Max 2 sentences, 120 characters total`,
    `- Conversational — like talking to one person, not a crowd`,
    `- Only mention the song, weather, or time if it lands naturally — never forced`,
    `- No "next up", "coming up next", "stay tuned", "don't go anywhere"`,
    `- No hype words: "amazing", "incredible", "fire", "banger", "heat"`,
    `- No emojis, no hashtags`,
    `- Output only the line. Nothing else.`,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
}

export async function POST(request: NextRequest) {
  const elevenKey = process.env.ELEVENLABS_API_KEY?.trim();
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();

  if (!elevenKey || !anthropicKey) {
    return new Response(JSON.stringify({ error: "Missing API keys." }), { status: 500 });
  }

  let body: SmartNarrateRequest;
  try {
    body = (await request.json()) as SmartNarrateRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request." }), { status: 400 });
  }

  const currentTitle = body.currentSongTitle?.trim() ?? "";
  const currentArtist = body.currentSongArtist?.trim() ?? "";
  const nextTitle = body.nextSongTitle?.trim() ?? "";
  const nextArtist = body.nextSongArtist?.trim() ?? "";
  const vibe = body.vibe?.trim() || "chill";

  if (!currentTitle || !nextTitle) {
    return new Response(JSON.stringify({ error: "Missing song info." }), { status: 400 });
  }

  // 1. Get live context (time + weather)
  const context = await getRadioContext();
  const prompt = buildDjScript(context, currentTitle, currentArtist, nextTitle, nextArtist, vibe);

  // 2. Generate DJ script with Claude
  let djLine: string;
  try {
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeRes.ok) throw new Error(`Claude ${claudeRes.status}`);

    const payload = (await claudeRes.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    djLine = payload.content?.find((b) => b.type === "text")?.text?.trim() ?? "";

    if (!djLine) throw new Error("Empty Claude response");
  } catch (err) {
    console.error("[smart-narrate] Claude error:", err);
    return new Response(JSON.stringify({ error: "Script generation failed." }), { status: 502 });
  }

  // 3. Convert to speech with ElevenLabs
  try {
    const ttsRes = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${VOICE_ID}`, {
      method: "POST",
      headers: {
        "xi-api-key": elevenKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: djLine,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.62,
          similarity_boost: 0.78,
          style: 0.35,
          use_speaker_boost: true,
        },
      }),
    });

    if (!ttsRes.ok) {
      const errText = await ttsRes.text().catch(() => "");
      console.error("[smart-narrate] ElevenLabs error:", ttsRes.status, errText);
      return new Response(JSON.stringify({ error: "TTS generation failed." }), { status: 502 });
    }

    const audioBuffer = await ttsRes.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-DJ-Line": encodeURIComponent(djLine.slice(0, 100)),
      },
    });
  } catch (err) {
    console.error("[smart-narrate] TTS error:", err);
    return new Response(JSON.stringify({ error: "TTS failed." }), { status: 502 });
  }
}
