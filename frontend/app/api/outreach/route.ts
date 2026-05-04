import { NextResponse } from "next/server";

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

export async function POST(request: Request) {
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
