import type { NextRequest } from "next/server";
import type { ArtistPromoOutput } from "@/lib/creatorHub/generators";
import { sendArtistSubmissionNotification } from "@/lib/mailer";

export const runtime = "nodejs";

type SubmitRequest = {
  artistName?: unknown;
  email?: unknown;
  songTitle?: unknown;
  genre?: unknown;
  vibe?: unknown;
  artistType?: unknown;
  description?: unknown;
  songLink?: unknown;
  streamingLink?: unknown;
  coverArtLink?: unknown;
  socialLink?: unknown;
  aiUsed?: unknown;
  aiTool?: unknown;
  notes?: unknown;
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

function stripCodeFence(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  return text;
}

function fallbackPromo(
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
  const v = vibe || "late night";
  const t = artistType || "independent artist";
  return {
    bio: `${a} is a ${t} carving out a distinctive sound in the ${g} space. Their latest release "${s}" captures ${v} energy — intentional, raw, and built for discovery. Follow their journey on FlowSoundz Radio and catch them before the mainstream catches on.`,
    suggestedVibe: vibe || "Chill",
    promoBlurb:
      description.length > 10
        ? `Up next on FlowSoundz Radio — ${a} with "${s}". ${description.slice(0, 90)}${description.length > 90 ? "…" : ""}`
        : `Up next on FlowSoundz Radio — ${a} with "${s}". Pure ${g} energy, curated just for you.`,
    radioIntro: `This is FlowSoundz Radio. You are about to hear "${s}" by ${a}. Stay locked in.`,
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

export async function POST(request: NextRequest) {
  let body: SubmitRequest;
  try {
    body = (await request.json()) as SubmitRequest;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const artistName = str(body.artistName);
  const email = str(body.email);
  const songTitle = str(body.songTitle);
  const genre = str(body.genre);
  const vibe = sanitizeVibe(body.vibe);
  const artistType = str(body.artistType) || "Independent Artist";
  const description = str(body.description);
  const songLink = str(body.songLink);
  const streamingLink = str(body.streamingLink);
  const coverArtLink = str(body.coverArtLink);
  const socialLink = str(body.socialLink);
  const aiUsed = Boolean(body.aiUsed);
  const aiTool = str(body.aiTool);
  const notes = str(body.notes);

  if (!artistName || !email || !songTitle || !genre) {
    return Response.json(
      { error: "artistName, email, songTitle, and genre are required." },
      { status: 422 },
    );
  }

  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();

  const aiLine = aiUsed && aiTool
    ? `AI tools used: ${aiTool}.`
    : aiUsed
      ? "Artist used AI tools in the creation process."
      : "No AI tools disclosed.";

  const prompt = [
    "You are a music marketing assistant for FlowSoundz Radio — a discovery-first underground independent artist station.",
    "",
    "Generate four promotional items for this artist submission. Return ONLY valid JSON (no markdown, no extra text).",
    "",
    `Artist: ${artistName}`,
    `Track: "${songTitle}"`,
    `Genre: ${genre}`,
    `Vibe: ${vibe}`,
    `Artist type: ${artistType}`,
    `Description: ${description || "Not provided"}`,
    aiLine,
    "",
    "Return ONLY this JSON object:",
    "{",
    '  "bio": "3-sentence artist bio in third person. Capture genre, sound, and what makes this release worth discovering.",',
    '  "suggestedVibe": "Exactly one of: Chill, Hype, Late Night, Emotional — the best fit.",',
    '  "promoBlurb": "1–2 sentences the station uses to introduce this track. Punchy, underground, radio-ready.",',
    '  "radioIntro": "One sentence the DJ reads right before the track plays. Short, confident, no fluff."',
    "}",
    "",
    "Tone: confident, premium, underground discovery energy.",
  ].join("\n");

  let promo: ArtistPromoOutput;

  if (!openAiKey && !anthropicKey) {
    promo = fallbackPromo(artistName, songTitle, genre, vibe, artistType, description);
  } else {
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
          raw = "";
        }
      }
    }

    if (!raw) {
      promo = fallbackPromo(artistName, songTitle, genre, vibe, artistType, description);
    } else {
      try {
        const parsed = JSON.parse(stripCodeFence(raw)) as Record<string, unknown>;
        const fb = fallbackPromo(artistName, songTitle, genre, vibe, artistType, description);
        promo = {
          bio: str(parsed.bio) || fb.bio,
          suggestedVibe: sanitizeVibe(parsed.suggestedVibe),
          promoBlurb: str(parsed.promoBlurb) || fb.promoBlurb,
          radioIntro: str(parsed.radioIntro) || fb.radioIntro,
        };
      } catch {
        promo = fallbackPromo(artistName, songTitle, genre, vibe, artistType, description);
      }
    }
  }

  // Fire-and-forget — don't fail the submission if email fails
  void sendArtistSubmissionNotification({
    artistName,
    email,
    songTitle,
    genre,
    vibe,
    artistType,
    description,
    songLink,
    streamingLink: streamingLink || undefined,
    coverArtLink: coverArtLink || undefined,
    socialLink: socialLink || undefined,
    aiUsed,
    aiTool: aiTool || undefined,
    notes: notes || undefined,
    bio: promo.bio,
    promoBlurb: promo.promoBlurb,
    radioIntro: promo.radioIntro,
    suggestedVibe: promo.suggestedVibe,
    submittedAt: new Date().toISOString(),
  }).catch(() => undefined);

  return Response.json(promo);
}
