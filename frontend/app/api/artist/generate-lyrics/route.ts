import type { NextRequest } from "next/server";
import type { LyricIdeasOutput } from "@/lib/creatorHub/generators";

export const runtime = "nodejs";

type LyricsRequest = {
  songIdea?: unknown;
  genre?: unknown;
  mood?: unknown;
  language?: unknown;
  explicit?: unknown;
  goal?: unknown;
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

function fallback(songIdea: string, genre: string, mood: string): LyricIdeasOutput {
  const idea = songIdea || "the feeling";
  const g = genre || "music";
  const m = mood || "this";
  return {
    hookIdeas: [
      `"${idea} — feels like the city never sleeps, and neither do I."`,
      `"Every time I close my eyes, I hear ${g} in my veins. Can't turn it off."`,
      `"They said ${m} was a phase. Turned it into my whole sound."`,
    ],
    titleIdeas: [
      `${m.charAt(0).toUpperCase() + m.slice(1)} Season`,
      `After ${idea.split(" ").slice(0, 3).join(" ")}`,
      `${g.charAt(0).toUpperCase() + g.slice(1)} Dreams`,
    ],
    captionIdeas: [
      `New drop. ${m} energy. ${g} in the soul. #FlowSoundz`,
      `For everyone who needed this today. Turn it up.`,
      `This one wrote itself. You already know the vibe.`,
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
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a creative lyric assistant for FlowSoundz Radio. Always respond with valid JSON only.",
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
  let body: LyricsRequest;
  try {
    body = (await request.json()) as LyricsRequest;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const songIdea = str(body.songIdea);
  const genre = str(body.genre);
  const mood = str(body.mood);
  const language = str(body.language) || "English";
  const explicit = str(body.explicit) || "Radio-Friendly";
  const goal = str(body.goal) || "Hook ideas";

  if (!songIdea || !genre || !mood) {
    return Response.json(
      { error: "songIdea, genre, and mood are required." },
      { status: 422 },
    );
  }

  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();

  if (!openAiKey && !anthropicKey) {
    return Response.json(fallback(songIdea, genre, mood));
  }

  const prompt = [
    "You are a creative lyric assistant for FlowSoundz Radio — an underground discovery-first artist station.",
    "",
    "An artist needs help with their song. Generate lyric ideas based on the details below.",
    "",
    `Song concept: ${songIdea}`,
    `Genre: ${genre}`,
    `Mood/Feeling: ${mood}`,
    `Language: ${language}`,
    `Version: ${explicit}`,
    `Goal: ${goal}`,
    "",
    "Return ONLY a valid JSON object with exactly these keys (no markdown, no extra text):",
    "{",
    '  "hookIdeas": ["3 hook line options — catchy, authentic, genre-appropriate. Each is a complete lyric fragment in quotes."],',
    '  "titleIdeas": ["3 track title options — short, memorable, fits the mood and genre."],',
    '  "captionIdeas": ["3 social media captions — one each for TikTok, Instagram, and general announcement. Brief, punchy, no hashtag spam."]',
    "}",
    "",
    "Tone: underground, real, not corporate. Write like a producer-artist hybrid, not a marketing bot.",
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
        return Response.json(fallback(songIdea, genre, mood));
      }
    } else {
      return Response.json(fallback(songIdea, genre, mood));
    }
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(stripCodeFence(raw)) as Record<string, unknown>;
  } catch {
    return Response.json(fallback(songIdea, genre, mood));
  }

  function toStringArray(v: unknown): string[] {
    if (!Array.isArray(v)) return [];
    return v.filter((item): item is string => typeof item === "string");
  }

  const output: LyricIdeasOutput = {
    hookIdeas:
      toStringArray(parsed.hookIdeas).length > 0
        ? toStringArray(parsed.hookIdeas)
        : fallback(songIdea, genre, mood).hookIdeas,
    titleIdeas:
      toStringArray(parsed.titleIdeas).length > 0
        ? toStringArray(parsed.titleIdeas)
        : fallback(songIdea, genre, mood).titleIdeas,
    captionIdeas:
      toStringArray(parsed.captionIdeas).length > 0
        ? toStringArray(parsed.captionIdeas)
        : fallback(songIdea, genre, mood).captionIdeas,
  };

  return Response.json(output);
}
