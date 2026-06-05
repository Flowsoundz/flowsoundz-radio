import type { NextRequest } from "next/server";
import { runAI, extractList } from "@/lib/creatorHub/aiEngine";
import type { LyricIdeasOutput } from "@/lib/creatorHub/generators";

export const runtime = "nodejs";

type LyricsRequest = {
  songIdea?: unknown;
  genre?: unknown;
  mood?: unknown;
  language?: unknown;
  explicit?: unknown;
  goal?: unknown;
  artistName?: unknown;
  coreThemes?: unknown;
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
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
  const artistName = str(body.artistName);
  const coreThemes = str(body.coreThemes);

  if (!songIdea || !genre || !mood) {
    return Response.json(
      { error: "songIdea, genre, and mood are required." },
      { status: 422 },
    );
  }

  const userPrompt = [
    "Generate lyric concepts for a FlowSoundz Radio artist.",
    "",
    "── TRACK DETAILS ──",
    artistName ? `Artist: ${artistName}` : "",
    `Song concept / lyric idea: ${songIdea}`,
    `Genre: ${genre}`,
    `Vibe / mood: ${mood}`,
    `Language: ${language}`,
    `Version: ${explicit}`,
    `Goal: ${goal}`,
    coreThemes ? `Core themes, instruments, or story: ${coreThemes}` : "",
    "",
    "── OUTPUT FORMAT ──",
    "Return ONLY the four tagged blocks below. Nothing else.",
    "",
    "<lyric_concepts>",
    "<hooks>",
    "Three hook line options. Each is a complete lyric fragment — catchy, specific, genre-authentic.",
    "No generic rhymes. No filler. Write like someone who actually lives this sound.",
    "1. [hook 1]",
    "2. [hook 2]",
    "3. [hook 3]",
    "</hooks>",
    "<titles>",
    "Three track title options. Short, evocative, fits the mood and genre perfectly.",
    "1. [title 1]",
    "2. [title 2]",
    "3. [title 3]",
    "</titles>",
    "<captions>",
    "Three social media captions — one each for TikTok, Instagram, YouTube.",
    "Brief, punchy. No hashtag spam. No exclamation marks unless earned.",
    "1. [TikTok caption]",
    "2. [Instagram caption]",
    "3. [YouTube caption]",
    "</captions>",
    "</lyric_concepts>",
  ].filter(Boolean).join("\n");

  const raw = await runAI(userPrompt, 1200);

  if (!raw) {
    return Response.json(fallback(songIdea, genre, mood));
  }

  const hookIdeas = extractList(raw, "hooks");
  const titleIdeas = extractList(raw, "titles");
  const captionIdeas = extractList(raw, "captions");

  const fb = fallback(songIdea, genre, mood);

  return Response.json({
    hookIdeas: hookIdeas.length >= 2 ? hookIdeas : fb.hookIdeas,
    titleIdeas: titleIdeas.length >= 2 ? titleIdeas : fb.titleIdeas,
    captionIdeas: captionIdeas.length >= 2 ? captionIdeas : fb.captionIdeas,
  } satisfies LyricIdeasOutput);
}
