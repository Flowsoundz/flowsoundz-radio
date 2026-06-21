import { NextResponse } from "next/server";

export const runtime = "edge";

const SYSTEM_PROMPT =
  "You are the AI DJ copywriter for FlowSoundz Radio, a discovery-first station for independent artists. Write one short transition line for live radio between songs. Tone should feel premium, natural, and on-brand. Keep it under 18 words. Avoid cliches, hashtags, emojis, and direct sales language. It should sound like a real host teasing the next moment, not marketing copy.";

type TransitionCopyRequest = {
  currentSongTitle?: unknown;
  currentSongArtist?: unknown;
  currentSongVibe?: unknown;
  nextSongTitle?: unknown;
  nextSongArtist?: unknown;
  nextSongVibe?: unknown;
  hostName?: unknown;
  hostTone?: unknown;
  transitionType?: unknown;
  timeOfDay?: unknown;
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

function buildFallbackDjLine(input: {
  currentSongTitle: string;
  currentSongArtist: string;
  nextSongTitle: string;
  nextSongArtist: string;
  transitionType: string;
  hostName: string;
}) {
  const host = input.hostName || "FlowSoundz";
  const next = `"${input.nextSongTitle}" by ${input.nextSongArtist}`;

  if (input.transitionType === "reset") {
    return `${host} resets the room with ${next}.`;
  }

  if (input.currentSongTitle && input.currentSongArtist) {
    return `From "${input.currentSongTitle}" by ${input.currentSongArtist} into ${next}.`;
  }

  return `${host} brings in ${next}.`;
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

  let body: TransitionCopyRequest;
  try {
    body = (await request.json()) as TransitionCopyRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const currentSongTitle = getString(body.currentSongTitle);
  const currentSongArtist = getString(body.currentSongArtist);
  const currentSongVibe = getString(body.currentSongVibe);
  const nextSongTitle = getString(body.nextSongTitle);
  const nextSongArtist = getString(body.nextSongArtist);
  const nextSongVibe = getString(body.nextSongVibe);
  const hostName = getString(body.hostName) || "FlowSoundz";
  const hostTone = getString(body.hostTone);
  const transitionType = getString(body.transitionType) || "direct";
  const timeOfDay = getString(body.timeOfDay) || "night";

  if (!nextSongTitle || !nextSongArtist) {
    return NextResponse.json(
      {
        djLine: buildFallbackDjLine({
          currentSongTitle,
          currentSongArtist,
          nextSongTitle: nextSongTitle || "the next track",
          nextSongArtist: nextSongArtist || "FlowSoundz",
          transitionType,
          hostName,
        }),
        degraded: true,
      },
      { status: 200 },
    );
  }

  const userPrompt = [
    `Current song title: ${currentSongTitle || "unknown"}`,
    `Current song artist: ${currentSongArtist || "unknown"}`,
    `Current song vibe: ${currentSongVibe || "unknown"}`,
    `Next song title: ${nextSongTitle}`,
    `Next song artist: ${nextSongArtist}`,
    `Next song vibe: ${nextSongVibe || "unknown"}`,
    `Host name: ${hostName}`,
    `Host tone: ${hostTone || "smooth, premium, discovery-first"}`,
    `Transition type: ${transitionType}`,
    `Time of day: ${timeOfDay}`,
    "",
    'Return JSON only: { "djLine": "..." }',
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL_DJ || "gpt-5.4-mini",
      instructions: SYSTEM_PROMPT,
      input: userPrompt,
      reasoning: { effort: "low" },
      text: {
        format: {
          type: "json_schema",
          name: "radio_transition_copy",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              djLine: { type: "string" },
            },
            required: ["djLine"],
          },
        },
      },
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as OpenAIResponse;

  if (!response.ok) {
    return NextResponse.json(
      {
        djLine: buildFallbackDjLine({
          currentSongTitle,
          currentSongArtist,
          nextSongTitle,
          nextSongArtist,
          transitionType,
          hostName,
        }),
        degraded: true,
        error:
          payload.error?.message ||
          "OpenAI request failed. Please try again.",
      },
      { status: 200 },
    );
  }

  const raw = extractOutputText(payload);
  if (!raw) {
    return NextResponse.json(
      {
        djLine: buildFallbackDjLine({
          currentSongTitle,
          currentSongArtist,
          nextSongTitle,
          nextSongArtist,
          transitionType,
          hostName,
        }),
        degraded: true,
      },
      { status: 200 },
    );
  }

  try {
    const parsed = JSON.parse(raw) as { djLine?: unknown };
    const djLine = getString(parsed.djLine);
    if (!djLine) {
      throw new Error("empty");
    }
    return NextResponse.json({ djLine });
  } catch {
    return NextResponse.json(
      {
        djLine: buildFallbackDjLine({
          currentSongTitle,
          currentSongArtist,
          nextSongTitle,
          nextSongArtist,
          transitionType,
          hostName,
        }),
        degraded: true,
      },
      { status: 200 },
    );
  }
}
