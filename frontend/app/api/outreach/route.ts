import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";

const SYSTEM_PROMPT_BASE =
  "You are an A&R assistant for a discovery-first radio platform called FlowSoundz. Write short, natural DM messages inviting artists to join. Each message must be unique — different opening, different angle. Under 3 sentences each. Feel human, confident, and non-spammy. Focus on early exposure and discovery. Avoid generic compliments like 'love your sound'.";

const TONE_MODIFIERS: Record<string, string> = {
  casual:
    "Tone: very casual and conversational, like texting a music friend. Keep it low-key and relaxed.",
  confident:
    "Tone: confident and direct. Lead with the value proposition. Professional but never stiff.",
  exclusive:
    "Tone: exclusive and FOMO-inducing. Make the artist feel they are being specifically handpicked.",
  friendly:
    "Tone: warm, encouraging, and supportive. Make the artist feel genuinely welcomed and excited.",
};

const FOLLOWUP_SYSTEM_PROMPT =
  "You are an A&R assistant for FlowSoundz Radio. The artist was already sent an initial DM and has not responded. Write 2 short, natural follow-up messages. Each must be different — one adds new context or value, the other is a gentle nudge. Under 2 sentences each. Non-pushy, human, no desperation.";

type OutreachRequest = {
  artistName?: unknown;
  songName?: unknown;
  genre?: unknown;
  description?: unknown;
  tone?: unknown;
  mode?: unknown;
  campaignName?: unknown;
  focus?: unknown;
  goal?: unknown;
  audience?: unknown;
  destination?: unknown;
  platforms?: unknown;
  rightsStatus?: unknown;
  aiDisclosure?: unknown;
  notes?: unknown;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: { message?: string };
};

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function extractOutputText(payload: OpenAIResponse) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (
        content.type === "output_text" &&
        typeof content.text === "string" &&
        content.text.trim()
      ) {
        return content.text.trim();
      }
    }
  }

  return "";
}

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 8)
    : [];
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  let body: OutreachRequest;
  try {
    body = (await request.json()) as OutreachRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const artistName = getString(body.artistName);
  const songName = getString(body.songName);
  const genre = getString(body.genre);
  const description = getString(body.description);
  const tone = getString(body.tone) || "confident";
  const mode = getString(body.mode) || "generate";

  if (mode === "social_campaign") {
    const campaignName = getString(body.campaignName) || "FlowSoundz Radio Launch";
    const focus = getString(body.focus);
    const goal = getString(body.goal) || "Drive listeners to the live radio page and turn attention into repeat listening.";
    const audience = getString(body.audience) || "Independent music fans, artists, producers, and early supporters.";
    const destination = getString(body.destination) || "/radio";
    const platforms = getStringArray(body.platforms);
    const rightsStatus = getString(body.rightsStatus) || "Only use approved station visuals and cleared audio.";
    const aiDisclosure = getString(body.aiDisclosure) || "Mention artist-led AI-assisted production only when relevant.";
    const notes = getString(body.notes);

    if (!focus) {
      return NextResponse.json(
        { error: "focus is required for a social campaign package." },
        { status: 422 },
      );
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_OUTREACH_MODEL || "gpt-4o-mini",
        instructions: [
          "You are the FlowSoundz 2026 Social Media Manager Agent.",
          "Think like a modern music-platform social manager: mobile-first, platform-native, clear hooks, captions, UTM-aware CTAs, and measurable outcomes.",
          "Do not promise guaranteed plays, approval, charts, revenue, virality, reach, or paid results.",
          "Keep paid promotion separate from editorial curation. Mark missing facts as pending rather than inventing proof.",
        ].join(" "),
        input: [
          `Campaign: ${campaignName}`,
          `Focus: ${focus}`,
          `Goal: ${goal}`,
          `Audience: ${audience}`,
          `Destination: ${destination}`,
          `Platforms: ${platforms.length ? platforms.join(", ") : "TikTok, Instagram Reels, YouTube Shorts, X, Facebook, Stories"}`,
          `Rights status: ${rightsStatus}`,
          `AI disclosure: ${aiDisclosure}`,
          `Notes: ${notes || "None"}`,
          "",
          "Create a daily social campaign package. Make every post copy ready to paste. Use one CTA per post. Include UTM content slugs.",
        ].join("\n"),
        reasoning: { effort: "low" },
        text: {
          format: {
            type: "json_schema",
            name: "social_campaign_package",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                dailyBrief: { type: "string" },
                primaryMessage: { type: "string" },
                videoConcepts: {
                  type: "array",
                  minItems: 3,
                  maxItems: 3,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      platform: { type: "string" },
                      hook: { type: "string" },
                      body: { type: "string" },
                      cta: { type: "string" },
                      assetIdea: { type: "string" },
                    },
                    required: ["platform", "hook", "body", "cta", "assetIdea"],
                  },
                },
                captions: {
                  type: "array",
                  minItems: 4,
                  maxItems: 6,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      platform: { type: "string" },
                      caption: { type: "string" },
                      utmContent: { type: "string" },
                    },
                    required: ["platform", "caption", "utmContent"],
                  },
                },
                artistRepost: { type: "string" },
                replies: {
                  type: "array",
                  minItems: 4,
                  maxItems: 6,
                  items: { type: "string" },
                },
                checklist: {
                  type: "array",
                  minItems: 4,
                  maxItems: 8,
                  items: { type: "string" },
                },
                tomorrowTest: { type: "string" },
              },
              required: [
                "dailyBrief",
                "primaryMessage",
                "videoConcepts",
                "captions",
                "artistRepost",
                "replies",
                "checklist",
                "tomorrowTest",
              ],
            },
          },
        },
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as OpenAIResponse;

    if (!response.ok) {
      return NextResponse.json(
        { error: payload.error?.message || "OpenAI request failed. Please try again." },
        { status: response.status },
      );
    }

    const raw = extractOutputText(payload);
    if (!raw) {
      return NextResponse.json({ error: "No campaign package was generated." }, { status: 502 });
    }

    try {
      return NextResponse.json({ campaign: JSON.parse(raw) });
    } catch {
      return NextResponse.json(
        { error: "Received an invalid campaign response format." },
        { status: 502 },
      );
    }
  }

  if (!artistName || !songName || !genre || !description) {
    return NextResponse.json(
      { error: "artistName, songName, genre, and description are required." },
      { status: 422 },
    );
  }

  const isFollowup = mode === "followup";
  const messageCount = isFollowup ? 2 : 5;

  const systemPrompt = isFollowup
    ? FOLLOWUP_SYSTEM_PROMPT
    : [
        SYSTEM_PROMPT_BASE,
        TONE_MODIFIERS[tone] ?? TONE_MODIFIERS.confident,
      ].join(" ");

  const userPrompt = isFollowup
    ? [
        `Artist name: ${artistName}`,
        `Song name: ${songName}`,
        `Genre: ${genre}`,
        `Description: ${description}`,
        "",
        `Write 2 follow-up DM messages. Return JSON: { "messages": ["...", "..."] }`,
      ].join("\n")
    : [
        `Artist name: ${artistName}`,
        `Song name: ${songName}`,
        `Genre: ${genre}`,
        `Description: ${description}`,
        "",
        `Write ${messageCount} unique outreach DM messages, each with a different angle or opening. Return JSON:`,
        '{ "messages": ["msg1", "msg2", "msg3", "msg4", "msg5"] }',
      ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_OUTREACH_MODEL || "gpt-4o-mini",
      instructions: systemPrompt,
      input: userPrompt,
      reasoning: { effort: "low" },
      text: {
        format: {
          type: "json_schema",
          name: "outreach_messages",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              messages: {
                type: "array",
                minItems: 1,
                maxItems: messageCount,
                items: { type: "string" },
              },
            },
            required: ["messages"],
          },
        },
      },
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as OpenAIResponse;

  if (!response.ok) {
    return NextResponse.json(
      {
        error:
          payload.error?.message || "OpenAI request failed. Please try again.",
      },
      { status: response.status },
    );
  }

  const raw = extractOutputText(payload);
  if (!raw) {
    return NextResponse.json(
      { error: "No outreach messages were generated." },
      { status: 502 },
    );
  }

  let parsed: { messages?: unknown };
  try {
    parsed = JSON.parse(raw) as { messages?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Received an invalid outreach response format." },
      { status: 502 },
    );
  }

  const messages = Array.isArray(parsed.messages)
    ? parsed.messages
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, messageCount)
    : [];

  if (messages.length === 0) {
    return NextResponse.json(
      { error: "No outreach messages were generated." },
      { status: 502 },
    );
  }

  return NextResponse.json({ messages });
}
