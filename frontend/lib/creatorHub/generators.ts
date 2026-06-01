// Client-side placeholder generators for the FlowSoundz Creator Hub.
// For real AI output, call /api/artist/generate-promo on the server.

// ── Types ─────────────────────────────────────────────────────────────────────

export type LyricIdeasInput = {
  songIdea: string;
  genre: string;
  mood: string;
  language: "English" | "Spanish" | "Bilingual";
  explicit: "Clean" | "Explicit" | "Radio-Friendly";
  goal:
    | "Hook ideas"
    | "Rewrite verse"
    | "Make it catchier"
    | "Translate"
    | "Create promo captions";
};

export type LyricIdeasOutput = {
  hookIdeas: string[];
  titleIdeas: string[];
  captionIdeas: string[];
};

export type VideoPromptInput = {
  artistName: string;
  songTitle: string;
  genre: string;
  vibe: string;
  visualStyle: string;
  videoType: string;
};

export type VideoPromptOutput = {
  prompt: string;
  tiktokCaption: string;
  igCaption: string;
  youtubeCaption: string;
};

export type ArtistPromoInput = {
  artistName: string;
  songTitle: string;
  genre: string;
  vibe: string;
  artistType: string;
  description: string;
  aiUsed?: boolean;
  aiTool?: string;
};

export type ArtistPromoOutput = {
  bio: string;
  suggestedVibe: string;
  promoBlurb: string;
  radioIntro: string;
  socialCaptions: string[];
};

// ── Generators ────────────────────────────────────────────────────────────────

export function generateLyricIdeas(input: LyricIdeasInput): LyricIdeasOutput {
  const { songIdea, genre, mood } = input;
  const idea = songIdea.trim() || "the feeling";
  const g = genre.trim() || "music";
  const m = mood.trim() || "this";

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
      `New drop. ${m} energy. ${g} in the soul. 🎵 #FlowSoundz`,
      `For everyone who needed this today. Turn it up. 🔊`,
      `This one wrote itself. You already know the vibe. ✨`,
    ],
  };
}

export function generateVideoPrompt(input: VideoPromptInput): VideoPromptOutput {
  const {
    artistName,
    songTitle,
    genre,
    vibe,
    visualStyle,
    videoType,
  } = input;

  const a = artistName.trim() || "the artist";
  const s = songTitle.trim() || "the track";

  return {
    prompt: `Create a 15-second vertical ${videoType} for ${a}'s track "${s}". Style: ${visualStyle}, with ${vibe} energy, ${genre} atmosphere, cinematic lighting, smooth camera movement, and space for FlowSoundz Radio branding. Keep it underground, premium, and discovery-first.`,
    tiktokCaption: `🎵 "${s}" – ${a} • This is the one 🔥 • #NewMusic #${genre.replace(/\s+/g, "")} #FlowSoundz #UndergroundSound`,
    igCaption: `New record out now. "${s}" by ${a}. ${vibe} vibes, ${genre} roots. Link in bio. 🎵✨`,
    youtubeCaption: `"${s}" – ${a} | ${genre} | ${vibe} | Discover it first on FlowSoundz Radio 🎧`,
  };
}

// Placeholder — server calls /api/artist/generate-promo for real AI output
export function generateArtistPromoAssets(
  input: ArtistPromoInput,
): ArtistPromoOutput {
  const { artistName, songTitle, genre, vibe, artistType, description } = input;
  const a = artistName.trim() || "This artist";
  const s = songTitle.trim() || "this track";
  const g = genre.trim() || "independent music";
  const v = vibe.trim() || "late night";
  const t = artistType.trim() || "independent artist";

  return {
    bio: `${a} is a ${t} carving out a distinctive sound in the ${g} space. Their latest release "${s}" captures ${v} energy — intentional, raw, and built for discovery. Follow their journey on FlowSoundz Radio and catch them before the mainstream catches on.`,
    suggestedVibe: vibe || "Chill",
    promoBlurb:
      description.trim().length > 10
        ? `Up next on FlowSoundz Radio — ${a} with "${s}". ${description.trim().slice(0, 90)}${description.trim().length > 90 ? "…" : ""}`
        : `Up next on FlowSoundz Radio — ${a} with "${s}". Pure ${g} energy, curated just for you.`,
    radioIntro: `This is FlowSoundz Radio. You are about to hear "${s}" by ${a}. Stay locked in.`,
    socialCaptions: [
      `${a} just landed on the FlowSoundz radar with "${s}" — ${v.toLowerCase()} energy and a clear point of view.`,
      `Now in the FlowSoundz submission lane: "${s}" by ${a}. ${g} roots, curated discovery energy.`,
      `If you're into independent records with intent, keep "${s}" by ${a} in your next listen rotation.`,
    ],
  };
}
