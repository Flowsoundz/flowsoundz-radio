import type { NextRequest } from "next/server";
import type { ArtistPromoOutput } from "@/lib/creatorHub/generators";
import { createArtistSubmission } from "@/lib/artistSubmissionStore";
import { sendArtistSubmissionNotification } from "@/lib/mailer";

export const runtime = "nodejs";

type SubmitRequest = {
  artistName?: unknown;
  contactName?: unknown;
  email?: unknown;
  songTitle?: unknown;
  genre?: unknown;
  vibe?: unknown;
  artistType?: unknown;
  description?: unknown;
  songLink?: unknown;
  versionType?: unknown;
  producerCredit?: unknown;
  streamingLink?: unknown;
  coverArtLink?: unknown;
  socialLink?: unknown;
  aiUsed?: unknown;
  aiTool?: unknown;
  rightsConfirmed?: unknown;
  samplesConfirmed?: unknown;
  promotionPermissionConfirmed?: unknown;
  removalPolicyConfirmed?: unknown;
  notes?: unknown;
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

const VALID_VIBES = ["Chill", "Hype", "Late Night", "Emotional", "Unsure"] as const;
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
    socialCaptions: [
      `${a} just landed on the FlowSoundz radar with "${s}" — ${v.toLowerCase()} energy and a clear point of view.`,
      `Now in the FlowSoundz discovery lane: "${s}" by ${a}. ${g} roots, curated with intent.`,
      `Independent music worth sitting with: "${s}" by ${a}, now in the FlowSoundz conversation.`,
    ],
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
  const contactName = str(body.contactName);
  const email = str(body.email);
  const songTitle = str(body.songTitle);
  const genre = str(body.genre);
  const vibe = sanitizeVibe(body.vibe);
  const artistType = str(body.artistType) || "Independent Artist";
  const description = str(body.description);
  const songLink = str(body.songLink);
  const versionType = str(body.versionType) || "Clean";
  const producerCredit = str(body.producerCredit);
  const streamingLink = str(body.streamingLink);
  const coverArtLink = str(body.coverArtLink);
  const socialLink = str(body.socialLink);
  const aiUsed = Boolean(body.aiUsed);
  const aiTool = str(body.aiTool);
  const rightsConfirmed = Boolean(body.rightsConfirmed);
  const samplesConfirmed = Boolean(body.samplesConfirmed);
  const promotionPermissionConfirmed = Boolean(body.promotionPermissionConfirmed);
  const removalPolicyConfirmed = Boolean(body.removalPolicyConfirmed);
  const notes = str(body.notes);

  if (!artistName || !contactName || !email || !songTitle || !genre || !songLink) {
    return Response.json(
      {
        error:
          "artistName, contactName, email, songTitle, genre, and songLink are required.",
      },
      { status: 422 },
    );
  }

  if (
    !rightsConfirmed ||
    !samplesConfirmed ||
    !promotionPermissionConfirmed ||
    !removalPolicyConfirmed
  ) {
    return Response.json(
      { error: "All permission confirmations are required before submission." },
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
    "You are a real music curator introducing an independent artist. Keep it polished, specific, and human. Do not sound corporate or generic.",
    "Avoid fake claims or inflated language. Do not call anyone the next big thing, revolutionary, or game-changing unless the description clearly supports it.",
    "",
    "Generate five promotional items for this artist submission. Return ONLY valid JSON (no markdown, no extra text).",
    "",
    `Artist: ${artistName}`,
    `Track: "${songTitle}"`,
    `Genre: ${genre}`,
    `Vibe: ${vibe}`,
    `Artist type: ${artistType}`,
    `Version: ${versionType}`,
    `Producer credit: ${producerCredit || "Not provided"}`,
    `Description: ${description || "Not provided"}`,
    aiLine,
    "",
    "Return ONLY this JSON object:",
    "{",
    '  "bio": "3-sentence artist bio in third person. Capture genre, sound, and what makes this release worth discovering.",',
    '  "suggestedVibe": "Exactly one of: Chill, Hype, Late Night, Emotional — the best fit.",',
    '  "promoBlurb": "1–2 sentences the station uses to introduce this track. Punchy, underground, radio-ready.",',
    '  "radioIntro": "One sentence the DJ reads right before the track plays. Short, confident, no fluff.",',
    '  "socialCaptions": ["caption 1", "caption 2", "caption 3"]',
    "}",
    "",
    "Tone: confident, human, music-industry-aware, and not robotic.",
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
          socialCaptions:
            Array.isArray(parsed.socialCaptions) &&
            parsed.socialCaptions.filter((caption): caption is string => typeof caption === "string" && caption.trim().length > 0).length > 0
              ? parsed.socialCaptions
                  .filter((caption): caption is string => typeof caption === "string" && caption.trim().length > 0)
                  .slice(0, 3)
              : fb.socialCaptions,
        };
      } catch {
        promo = fallbackPromo(artistName, songTitle, genre, vibe, artistType, description);
      }
    }
  }

  // Fire-and-forget — don't fail the submission if email fails
  void sendArtistSubmissionNotification({
    artistName,
    contactName,
    email,
    songTitle,
    genre,
    vibe,
    artistType,
    description,
    songLink,
    versionType,
    producerCredit: producerCredit || undefined,
    streamingLink: streamingLink || undefined,
    coverArtLink: coverArtLink || undefined,
    socialLink: socialLink || undefined,
    aiUsed,
    aiTool: aiTool || undefined,
    rightsConfirmed,
    samplesConfirmed,
    promotionPermissionConfirmed,
    removalPolicyConfirmed,
    notes: notes || undefined,
    bio: promo.bio,
    promoBlurb: promo.promoBlurb,
    radioIntro: promo.radioIntro,
    socialCaptions: promo.socialCaptions,
    suggestedVibe: promo.suggestedVibe,
    submittedAt: new Date().toISOString(),
  }).catch(() => undefined);

  try {
    const submission = await createArtistSubmission({
      artist_name: artistName,
      contact_name: contactName,
      email,
      song_title: songTitle,
      genre,
      vibe,
      artist_type: artistType,
      description,
      song_link: songLink,
      version_type: versionType,
      producer_credit: producerCredit || null,
      streaming_link: streamingLink || null,
      cover_art_link: coverArtLink || null,
      social_link: socialLink || null,
      ai_used: aiUsed,
      ai_tool: aiTool || null,
      rights_confirmed: rightsConfirmed,
      samples_confirmed: samplesConfirmed,
      promotion_permission_confirmed: promotionPermissionConfirmed,
      removal_policy_confirmed: removalPolicyConfirmed,
      notes: notes || null,
      promo,
    });

    return Response.json({ ...promo, submission_id: submission.submission_id });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to store artist submission.",
      },
      { status: 500 },
    );
  }
}
