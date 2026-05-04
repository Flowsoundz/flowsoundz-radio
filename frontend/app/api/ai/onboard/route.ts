import type { NextRequest } from "next/server";
import {
  VIBE_TAG_OPTIONS,
  type AiOnboardProfile,
  type VibeTag,
} from "@/lib/promoOnboarding";

export const runtime = "nodejs";

type OnboardRequest = {
  trackTitle?: unknown;
  artistName?: unknown;
  genre?: unknown;
  description?: unknown;
};

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeVibeTag(value: unknown): VibeTag {
  const candidate = getString(value).toLowerCase().replace(/\s+/g, "_");
  return VIBE_TAG_OPTIONS.includes(candidate as VibeTag)
    ? (candidate as VibeTag)
    : "chill";
}

function stripCodeFence(raw: string): string {
  const text = raw.trim();
  if (!text.startsWith("```")) {
    return text;
  }

  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

function fallbackProfile(
  artistName: string,
  trackTitle: string,
  genre: string,
): AiOnboardProfile {
  return {
    artist_bio: `${artistName} is an independent artist building momentum through ${genre || "discovery-driven"} releases. Their latest track "${trackTitle}" brings a focused sound that fits the FlowSoundz lane. This artist arrives with a clear point of view and a record built for repeat listens.`,
    vibe_tag: "chill",
    promo_blurb: `Now on FlowSoundz Radio: ${artistName} with "${trackTitle}" — a fresh record with real atmosphere and replay value.`,
  };
}

async function generateWithAnthropic(
  apiKey: string,
  payload: OnboardRequest,
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      system:
        'You are a professional music A&R assistant.\n\nGiven artist info, return ONLY JSON:\n\n{\n  "artist_bio": "3 sentence professional bio",\n  "vibe_tag": "chill | hype | late_night | emotional",\n  "promo_blurb": "short radio introduction"\n}\n\nNo extra text.',
      messages: [
        {
          role: "user",
          content: [
            `Track title: ${getString(payload.trackTitle) || "Unknown track"}`,
            `Artist name: ${getString(payload.artistName) || "Unknown artist"}`,
            `Genre: ${getString(payload.genre) || "Unknown genre"}`,
            `Description: ${getString(payload.description) || "No description provided."}`,
          ].join("\n"),
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Anthropic request failed with ${response.status}`);
  }

  const json = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };

  return (
    json.content?.find((block) => block.type === "text")?.text?.trim() ?? ""
  );
}

function parseAiProfile(raw: string): Partial<AiOnboardProfile> {
  return JSON.parse(stripCodeFence(raw)) as Partial<AiOnboardProfile>;
}

export async function POST(request: NextRequest) {
  let body: OnboardRequest;

  try {
    body = (await request.json()) as OnboardRequest;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const trackTitle = getString(body.trackTitle);
  const artistName = getString(body.artistName);
  const genre = getString(body.genre);
  const description = getString(body.description);

  if (!trackTitle || !artistName || !genre || !description) {
    return Response.json(
      {
        error:
          "trackTitle, artistName, genre, and description are required.",
      },
      { status: 422 },
    );
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const fallback = fallbackProfile(artistName, trackTitle, genre);

  if (!anthropicKey) {
    return Response.json(fallback);
  }

  try {
    const raw = await generateWithAnthropic(anthropicKey, body);
    const parsed = parseAiProfile(raw);

    return Response.json({
      artist_bio: getString(parsed.artist_bio) || fallback.artist_bio,
      vibe_tag: normalizeVibeTag(parsed.vibe_tag),
      promo_blurb: getString(parsed.promo_blurb) || fallback.promo_blurb,
    } satisfies AiOnboardProfile);
  } catch {
    return Response.json(fallback);
  }
}
