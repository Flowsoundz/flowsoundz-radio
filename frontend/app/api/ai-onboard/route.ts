import type { NextRequest } from "next/server";

export const runtime = "nodejs";

type OnboardRequest = {
  artistName?: unknown;
  trackTitle?: unknown;
  genre?: unknown;
  description?: unknown;
};

type AiProfile = {
  bio: string;
  vibe: "Chill" | "Hype" | "Late Night" | "Emotional";
  promoBlurb: string;
};

function getString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

const VALID_VIBES = ["Chill", "Hype", "Late Night", "Emotional"] as const;

function sanitizeVibe(v: unknown): AiProfile["vibe"] {
  const s = getString(v);
  return (VALID_VIBES as readonly string[]).includes(s)
    ? (s as AiProfile["vibe"])
    : "Chill";
}

function parseProfileJson(raw: string): Record<string, unknown> {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  return JSON.parse(text) as Record<string, unknown>;
}

function fallbackProfile(
  artistName: string,
  trackTitle: string,
  genre: string,
): AiProfile {
  return {
    bio: `${artistName} is an independent artist carving out their lane in the ${genre} space. Their latest release "${trackTitle}" is a testament to their unique sound and vision. Catch them on FlowSoundz Radio.`,
    vibe: "Chill",
    promoBlurb: `Up next — ${artistName} with "${trackTitle}". Don't miss this one.`,
  };
}

async function generateWithAnthropic(
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
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(err || `Anthropic API error ${res.status}`);
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  return data.content?.find((b) => b.type === "text")?.text ?? "";
}

async function generateWithOpenAI(
  apiKey: string,
  prompt: string,
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL_DJ ?? "gpt-4o",
      max_tokens: 512,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an onboarding assistant for FlowSoundz Radio. Always respond with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(err || `OpenAI API error ${res.status}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

export async function POST(request: NextRequest) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();

  if (!anthropicKey && !openAiKey) {
    return Response.json(
      {
        error:
          "No AI API key configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.",
      },
      { status: 500 },
    );
  }

  let body: OnboardRequest;
  try {
    body = (await request.json()) as OnboardRequest;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const artistName = getString(body.artistName);
  const trackTitle = getString(body.trackTitle);
  const genre = getString(body.genre);
  const description = getString(body.description);

  if (!artistName || !trackTitle || !genre) {
    return Response.json(
      { error: "artistName, trackTitle, and genre are required." },
      { status: 422 },
    );
  }

  const descriptionLine = description
    ? `Artist's own description: ${description}`
    : "No additional description provided.";

  const prompt = [
    "You are an onboarding assistant for FlowSoundz Radio, a discovery-first independent artist station.",
    "",
    "An artist just submitted their release. Generate three items based on the details below.",
    "",
    `Artist name: ${artistName}`,
    `Track title: ${trackTitle}`,
    `Genre: ${genre}`,
    descriptionLine,
    "",
    "Return ONLY a valid JSON object with exactly these keys — no markdown, no extra text:",
    "{",
    '  "bio": "3-sentence artist bio in third person. Capture their genre, sound, and the emotion or story behind this track.",',
    '  "vibe": "Exactly one of: Chill, Hype, Late Night, or Emotional — whichever fits this track best.",',
    '  "promoBlurb": "1–2 sentence intro the station DJ reads right before playing the track. Punchy and radio-ready."',
    "}",
  ].join("\n");

  let rawText = "";
  try {
    if (openAiKey) {
      rawText = await generateWithOpenAI(openAiKey, prompt);
    } else if (anthropicKey) {
      rawText = await generateWithAnthropic(anthropicKey, prompt);
    }
  } catch (err) {
    // Primary (OpenAI) failed — try Claude as fallback
    if (openAiKey && anthropicKey) {
      try {
        rawText = await generateWithAnthropic(anthropicKey, prompt);
      } catch {
        return Response.json(
          { error: "Both AI providers failed. Please try again." },
          { status: 502 },
        );
      }
    } else {
      return Response.json(
        {
          error:
            err instanceof Error ? err.message : "AI generation failed.",
        },
        { status: 502 },
      );
    }
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = parseProfileJson(rawText);
  } catch {
    return Response.json(
      { error: "AI returned an unexpected format. Please try again." },
      { status: 502 },
    );
  }

  const profile: AiProfile = {
    bio:
      getString(parsed.bio) ||
      fallbackProfile(artistName, trackTitle, genre).bio,
    vibe: sanitizeVibe(parsed.vibe),
    promoBlurb:
      getString(parsed.promoBlurb) ||
      fallbackProfile(artistName, trackTitle, genre).promoBlurb,
  };

  return Response.json(profile);
}
