import type { NextRequest } from "next/server";
import { runAI, extractTag, sanitizeInput } from "@/lib/creatorHub/aiEngine";
import type { VideoPromptOutput } from "@/lib/creatorHub/generators";

export const runtime = "nodejs";

type VideoPromptRequest = {
  artistName?: unknown;
  songTitle?: unknown;
  genre?: unknown;
  vibe?: unknown;
  visualStyle?: unknown;
  videoType?: unknown;
  lyricSnippet?: unknown;
  coreThemes?: unknown;
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function fallback(
  artistName: string,
  songTitle: string,
  genre: string,
  vibe: string,
  visualStyle: string,
  videoType: string,
): VideoPromptOutput {
  const a = artistName || "the artist";
  const s = songTitle || "the track";
  return {
    prompt: `Create a 15-second vertical ${videoType} for ${a}'s track "${s}". Style: ${visualStyle}, with ${vibe} energy, ${genre} atmosphere, cinematic lighting, slow-burn camera movement. Underground, premium, discovery-first.`,
    tiktokCaption: `"${s}" – ${a}. You needed to hear this. #NewMusic #${genre.replace(/\s+/g, "")} #FlowSoundz`,
    igCaption: `"${s}" by ${a}. ${vibe} energy, ${genre} roots. Now in the FlowSoundz discovery rotation.`,
    youtubeCaption: `"${s}" – ${a} | ${genre} | ${vibe} | FlowSoundz Radio`,
  };
}

export async function POST(request: NextRequest) {
  let body: VideoPromptRequest;
  try {
    body = (await request.json()) as VideoPromptRequest;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const artistName = sanitizeInput(str(body.artistName));
  const songTitle = sanitizeInput(str(body.songTitle));
  const genre = sanitizeInput(str(body.genre)) || "independent";
  const vibe = str(body.vibe) || "Chill";
  const visualStyle = str(body.visualStyle) || "Cinematic";
  const videoType = str(body.videoType) || "Music video";
  const lyricSnippet = sanitizeInput(str(body.lyricSnippet));
  const coreThemes = sanitizeInput(str(body.coreThemes));

  if (!artistName || !songTitle) {
    return Response.json(
      { error: "artistName and songTitle are required." },
      { status: 422 },
    );
  }

  const userPrompt = [
    "Generate a visual content package for a FlowSoundz Radio artist.",
    "",
    "── TRACK DETAILS ──",
    `Artist: ${artistName}`,
    `Track: "${songTitle}"`,
    `Genre: ${genre}`,
    `Vibe: ${vibe}`,
    `Visual style: ${visualStyle}`,
    `Video type: ${videoType}`,
    lyricSnippet ? `Lyric snippet / concept: ${lyricSnippet}` : "",
    coreThemes ? `Core themes or story elements: ${coreThemes}` : "",
    "",
    "── OUTPUT FORMAT ──",
    "Return ONLY the tagged block below. Nothing else.",
    "",
    "<video_prompts>",
    "<main_prompt>",
    "A 2-3 sentence AI video generation prompt. Specify: visual style, color palette, lighting mood, camera movement, atmosphere. Optimized for Runway, Pika, Kling, or LTX Studio. 15-second vertical format.",
    "Make it feel like a real director's brief, not a list of keywords.",
    "</main_prompt>",
    "<tiktok>",
    "One TikTok caption. Under 120 characters. Punchy, discovery energy. 2-3 hashtags max, naturally placed.",
    "</tiktok>",
    "<instagram>",
    "One Instagram caption. 1-2 sentences. Cinematic tone. Ends with a reason to click or listen.",
    "</instagram>",
    "<youtube>",
    "One YouTube title/caption: Artist | Track | Genre | FlowSoundz Radio. Can include a short descriptor.",
    "</youtube>",
    "</video_prompts>",
  ].filter(Boolean).join("\n");

  const raw = await runAI(userPrompt, 1000);

  if (!raw) {
    return Response.json(fallback(artistName, songTitle, genre, vibe, visualStyle, videoType));
  }

  const mainPrompt = extractTag(raw, "main_prompt");
  const tiktokCaption = extractTag(raw, "tiktok");
  const igCaption = extractTag(raw, "instagram");
  const youtubeCaption = extractTag(raw, "youtube");

  const fb = fallback(artistName, songTitle, genre, vibe, visualStyle, videoType);

  return Response.json({
    prompt: mainPrompt || fb.prompt,
    tiktokCaption: tiktokCaption || fb.tiktokCaption,
    igCaption: igCaption || fb.igCaption,
    youtubeCaption: youtubeCaption || fb.youtubeCaption,
  } satisfies VideoPromptOutput);
}
