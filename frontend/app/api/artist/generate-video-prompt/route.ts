import type { NextRequest } from "next/server";
import type { VideoPromptOutput } from "@/lib/creatorHub/generators";

export const runtime = "nodejs";

type VideoPromptRequest = {
  artistName?: unknown;
  songTitle?: unknown;
  genre?: unknown;
  vibe?: unknown;
  visualStyle?: unknown;
  videoType?: unknown;
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function stripCodeFence(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  return text;
}

function fallback(
  artistName: string,
  songTitle: string,
  genre: string,
  vibe: string,
  visualStyle: string,
  videoType: string,
): VideoPromptOutput {
  const a = artistName || "the artist";
  const s = songTitle || "the track";
  return {
    prompt: `Create a 15-second vertical ${videoType} for ${a}'s track "${s}". Style: ${visualStyle}, with ${vibe} energy, ${genre} atmosphere, cinematic lighting, smooth camera movement, and space for FlowSoundz Radio branding. Keep it underground, premium, and discovery-first.`,
    tiktokCaption: `🎵 "${s}" – ${a} • This is the one 🔥 #NewMusic #${genre.replace(/\s+/g, "")} #FlowSoundz #UndergroundSound`,
    igCaption: `New record out now. "${s}" by ${a}. ${vibe} vibes, ${genre} roots. Link in bio. 🎵✨`,
    youtubeCaption: `"${s}" – ${a} | ${genre} | ${vibe} | Discover it first on FlowSoundz Radio 🎧`,
  };
}

async function callOpenAI(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL_DJ ?? "gpt-4o",
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a music video creative director for FlowSoundz Radio. Always respond with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

async function callAnthropic(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  return data.content?.find((b) => b.type === "text")?.text ?? "";
}

export async function POST(request: NextRequest) {
  let body: VideoPromptRequest;
  try {
    body = (await request.json()) as VideoPromptRequest;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const artistName = str(body.artistName);
  const songTitle = str(body.songTitle);
  const genre = str(body.genre) || "independent";
  const vibe = str(body.vibe) || "Chill";
  const visualStyle = str(body.visualStyle) || "Cinematic";
  const videoType = str(body.videoType) || "Music video";

  if (!artistName || !songTitle) {
    return Response.json(
      { error: "artistName and songTitle are required." },
      { status: 422 },
    );
  }

  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();

  if (!openAiKey && !anthropicKey) {
    return Response.json(fallback(artistName, songTitle, genre, vibe, visualStyle, videoType));
  }

  const prompt = [
    "You are a music video creative director for FlowSoundz Radio — an underground, discovery-first independent artist station.",
    "",
    "Generate a video creation package for the track below.",
    "",
    `Artist: ${artistName}`,
    `Track: ${songTitle}`,
    `Genre: ${genre}`,
    `Vibe: ${vibe}`,
    `Visual style: ${visualStyle}`,
    `Video type: ${videoType}`,
    "",
    "Return ONLY a valid JSON object with exactly these keys (no markdown, no extra text):",
    "{",
    '  "prompt": "A detailed 2-3 sentence AI video generation prompt. Include visual style, lighting, camera movement, atmosphere, and color palette. Optimized for Runway, Pika, Kling, or LTX Studio. 15-second vertical format.",',
    '  "tiktokCaption": "A TikTok caption under 150 characters. Punchy, includes 3-4 hashtags naturally.",',
    '  "igCaption": "An Instagram caption 1-2 sentences. Discovery energy, ends with call-to-action.",',
    '  "youtubeCaption": "A YouTube title/caption format — artist | track | genre | platform tag."',
    "}",
    "",
    "Tone: premium underground. Not corporate, not spammy. Sounds like a real music discovery platform.",
  ].join("\n");

  let raw = "";
  try {
    raw = openAiKey
      ? await callOpenAI(openAiKey, prompt)
      : await callAnthropic(anthropicKey!, prompt);
  } catch {
    if (openAiKey && anthropicKey) {
      try {
        raw = await callAnthropic(anthropicKey, prompt);
      } catch {
        return Response.json(fallback(artistName, songTitle, genre, vibe, visualStyle, videoType));
      }
    } else {
      return Response.json(fallback(artistName, songTitle, genre, vibe, visualStyle, videoType));
    }
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(stripCodeFence(raw)) as Record<string, unknown>;
  } catch {
    return Response.json(fallback(artistName, songTitle, genre, vibe, visualStyle, videoType));
  }

  const fb = fallback(artistName, songTitle, genre, vibe, visualStyle, videoType);
  const output: VideoPromptOutput = {
    prompt:
      typeof parsed.prompt === "string" && parsed.prompt.trim()
        ? parsed.prompt.trim()
        : fb.prompt,
    tiktokCaption:
      typeof parsed.tiktokCaption === "string" && parsed.tiktokCaption.trim()
        ? parsed.tiktokCaption.trim()
        : fb.tiktokCaption,
    igCaption:
      typeof parsed.igCaption === "string" && parsed.igCaption.trim()
        ? parsed.igCaption.trim()
        : fb.igCaption,
    youtubeCaption:
      typeof parsed.youtubeCaption === "string" && parsed.youtubeCaption.trim()
        ? parsed.youtubeCaption.trim()
        : fb.youtubeCaption,
  };

  return Response.json(output);
}
