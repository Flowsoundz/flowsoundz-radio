import type { NextRequest } from "next/server";
import type { ArtistPromoOutput } from "@/lib/creatorHub/generators";

export const runtime = "nodejs";

type PromoRequest = {
  artistName?: unknown;
  songTitle?: unknown;
  genre?: unknown;
  vibe?: unknown;
  artistType?: unknown;
  description?: unknown;
  aiUsed?: unknown;
  aiTool?: unknown;
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

const VALID_VIBES = ["Chill", "Hype", "Late Night", "Emotional"] as const;
type Vibe = (typeof VALID_VIBES)[number];

function sanitizeVibe(v: unknown): Vibe {
  const s = str(v);
  return (VALID_VIBES as readonly string[]).includes(s) ? (s as Vibe) : "Chill";
}

function fallback(
  artistName: string,
  songTitle: string,
  genre: string,
  vibe: string,
  artistType: string,
  description: string,
): ArtistPromoOutput {
  const a = artistName || "This artist";
  const s = songTitle || "this track";
  const g = genre || "independent music";
  return {
    bio: `${a} is a ${artistType} creating ${g} music with a sound that demands attention. Their latest release "${s}" delivers ${vibe.toLowerCase()} energy from start to finish — honest, intentional, and built for discovery. Catch them on FlowSoundz Radio before everyone else does.`,
    suggestedVibe: vibe,
    promoBlurb:
      description.length > 10
        ? `Up next on FlowSoundz Radio — ${a} with "${s}". ${description.slice(0, 90)}${description.length > 90 ? "…" : ""}`
        : `Up next on FlowSoundz Radio — ${a} with "${s}". Pure ${g} energy, curated just for you.`,
    radioIntro: `This is FlowSoundz Radio. You're about to hear "${s}" by ${a}. Stay locked in.`,
    socialCaptions: [
      `${a} just landed on the FlowSoundz radar with "${s}" — ${vibe.toLowerCase()} energy and a clear point of view.`,
      `Now in the FlowSoundz discovery lane: "${s}" by ${a}. ${g} roots, curated with intent.`,
      `Independent music worth sitting with: "${s}" by ${a}, now in the FlowSoundz conversation.`,
    ],
  };
}

function stripCodeFence(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  return text;
}

async function callAnthropic(
  apiKey: string,
  prompt: string,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  return data.content?.find((b) => b.type === "text")?.text ?? "";
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
      max_tokens: 600,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a music marketing assistant for FlowSoundz Radio. Always respond with valid JSON only.",
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

export async function POST(request: NextRequest) {
  let body: PromoRequest;
  try {
    body = (await request.json()) as PromoRequest;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const artistName = str(body.artistName);
  const songTitle = str(body.songTitle);
  const genre = str(body.genre);
  const rawVibe = str(body.vibe);
  const vibe = sanitizeVibe(rawVibe);
  const artistType = str(body.artistType) || "independent artist";
  const description = str(body.description);
  const aiUsed = Boolean(body.aiUsed);
  const aiTool = str(body.aiTool);

  if (!artistName || !songTitle || !genre) {
    return Response.json(
      { error: "artistName, songTitle, and genre are required." },
      { status: 422 },
    );
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();

  // No AI keys — return structured fallback immediately
  if (!anthropicKey && !openAiKey) {
    return Response.json(
      fallback(artistName, songTitle, genre, vibe, artistType, description),
    );
  }

  const aiLine = aiUsed && aiTool
    ? `AI tools used: ${aiTool}.`
    : aiUsed
      ? "Artist used AI tools in the creation process."
      : "No AI tools disclosed.";

  const descLine = description
    ? `Artist's description: "${description}"`
    : "No additional description provided.";

  const prompt = [
    "You are a real music curator introducing an independent artist. Keep it polished, specific, and human. Do not sound corporate or generic.",
    "Avoid fake claims or inflated language. Do not call anyone the next big thing, revolutionary, or game-changing unless the description clearly supports it.",
    "",
    "An artist just submitted their release. Generate five items in valid JSON (no markdown, no extra text).",
    "",
    `Artist: ${artistName}`,
    `Song: ${songTitle}`,
    `Genre: ${genre}`,
    `Vibe: ${vibe}`,
    `Artist type: ${artistType}`,
    descLine,
    aiLine,
    "",
    "Return ONLY this JSON object:",
    "{",
    '  "bio": "3-sentence artist bio in third person. Capture their genre, sound, and what makes this release worth discovering.",',
    '  "suggestedVibe": "Exactly one of: Chill, Hype, Late Night, Emotional — the best fit.",',
    '  "promoBlurb": "1–2 sentences the station uses to introduce this track. Punchy, underground, radio-ready.",',
    '  "radioIntro": "One sentence the DJ reads right before the track plays. Short, confident, no fluff.",',
    '  "socialCaptions": ["caption 1", "caption 2", "caption 3"]',
    "}",
    "",
    "Tone: confident, human, music-industry-aware, and not robotic.",
  ].join("\n");

  let raw = "";
  try {
    raw = openAiKey
      ? await callOpenAI(openAiKey, prompt)
      : await callAnthropic(anthropicKey!, prompt);
  } catch {
    // Primary (OpenAI) failed — try Claude as fallback
    if (openAiKey && anthropicKey) {
      try {
        raw = await callAnthropic(anthropicKey, prompt);
      } catch {
        return Response.json(
          fallback(artistName, songTitle, genre, vibe, artistType, description),
        );
      }
    } else {
      return Response.json(
        fallback(artistName, songTitle, genre, vibe, artistType, description),
      );
    }
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(stripCodeFence(raw)) as Record<string, unknown>;
  } catch {
    return Response.json(
      fallback(artistName, songTitle, genre, vibe, artistType, description),
    );
  }

  const output: ArtistPromoOutput = {
    bio:
      str(parsed.bio) ||
      fallback(artistName, songTitle, genre, vibe, artistType, description).bio,
    suggestedVibe: sanitizeVibe(parsed.suggestedVibe),
    promoBlurb:
      str(parsed.promoBlurb) ||
      fallback(artistName, songTitle, genre, vibe, artistType, description)
        .promoBlurb,
    radioIntro:
      str(parsed.radioIntro) ||
      fallback(artistName, songTitle, genre, vibe, artistType, description)
        .radioIntro,
    socialCaptions:
      Array.isArray(parsed.socialCaptions) &&
      parsed.socialCaptions.filter((caption): caption is string => typeof caption === "string" && caption.trim().length > 0).length > 0
        ? parsed.socialCaptions
            .filter((caption): caption is string => typeof caption === "string" && caption.trim().length > 0)
            .slice(0, 3)
        : fallback(artistName, songTitle, genre, vibe, artistType, description)
            .socialCaptions,
  };

  return Response.json(output);
}
