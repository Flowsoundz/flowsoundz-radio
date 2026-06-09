import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM"; // default: Rachel

type Lang = "en" | "es" | "spanglish";

const SYSTEM_PROMPTS: Record<Lang, string> = {
  en: `You are the host of FlowSoundz Radio — a high-energy, modern internet radio station.
Your style: smooth but electric, witty, street-smart with Caribbean flair. Hype tracks with sharp one-liners and creative mottos — energetic and relatable, never corny or corporate.
Speak in English only. Keep it short — 1-2 punchy sentences MAX. No hashtags. No emojis.
Sound like a real DJ on air.`,

  es: `Eres el host de FlowSoundz Radio — una estación de radio online energética y moderna.
Tu estilo: smooth pero con candela, ingenioso, con sabor caribeño dominicano. Usas "lemas" creativos y frases que calientan el track — energético y relatable, nunca corporativo.
Habla solo en español. Máximo 1-2 frases cortas y directas. Sin hashtags. Sin emojis.
Suena como un DJ real en vivo.`,

  spanglish: `You are the host of FlowSoundz Radio — a high-energy bilingual internet radio station.
Your style: effortlessly bilingual with Caribbean flair, smooth but electric. Switch between English and Spanish naturally mid-sentence when it hits harder. Creative mottos, energetic, relatable — never stiff.
Mix both languages. Keep it to 1-2 punchy sentences MAX. No hashtags. No emojis.
Sound like a real bilingual DJ on air.`,
};

async function generateScript(context: {
  trackTitle: string;
  artist: string;
  vibe: string;
  lang: Lang;
  listenerCount?: number;
}): Promise<string> {
  const client = new Anthropic();
  const { trackTitle, artist, vibe, lang, listenerCount } = context;

  const userPrompt =
    lang === "es"
      ? `Presenta "${trackTitle}" de ${artist}. Vibe: ${vibe}.${listenerCount ? ` ${listenerCount} personas están escuchando ahora.` : ""} Dale candela.`
      : `Introduce "${trackTitle}" by ${artist}. Vibe: ${vibe}.${listenerCount ? ` ${listenerCount} people are listening right now.` : ""} Make it hit.`;

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 100,
    system: SYSTEM_PROMPTS[lang],
    messages: [{ role: "user", content: userPrompt }],
  });

  return (msg.content[0] as { text: string }).text.trim();
}

// Simple in-memory cache — keyed by trackId so we don't regenerate on every play
const dropCache = new Map<string, { url: string; ts: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: Request) {
  if (!ELEVENLABS_API_KEY) {
    return Response.json({ error: "ElevenLabs not configured." }, { status: 503 });
  }

  let body: {
    trackId?: unknown;
    trackTitle?: unknown;
    artist?: unknown;
    vibe?: unknown;
    lang?: unknown;
    listenerCount?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  const trackId = typeof body.trackId === "string" ? body.trackId : null;
  const trackTitle = typeof body.trackTitle === "string" ? body.trackTitle : "this track";
  const artist = typeof body.artist === "string" ? body.artist : "FlowSoundz";
  const vibe = typeof body.vibe === "string" ? body.vibe : "chill";
  const lang: Lang = (["en", "es", "spanglish"].includes(body.lang as string) ? body.lang : "en") as Lang;
  const listenerCount = typeof body.listenerCount === "number" ? body.listenerCount : undefined;

  // Return cached drop for this track if fresh
  if (trackId) {
    const cached = dropCache.get(trackId);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return Response.json({ url: cached.url, cached: true });
    }
  }

  let script: string;
  try {
    script = await generateScript({ trackTitle, artist, vibe, lang, listenerCount });
  } catch (err) {
    console.error("[dj-drop] Claude script error:", err);
    return Response.json({ error: "Script generation failed." }, { status: 502 });
  }

  let ttsRes: Response;
  try {
    ttsRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: script,
          model_id: "eleven_turbo_v2",
          voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
        }),
      },
    );
  } catch (err) {
    console.error("[dj-drop] ElevenLabs fetch error:", err);
    return Response.json({ error: "TTS request failed." }, { status: 502 });
  }

  if (!ttsRes.ok) {
    const err = await ttsRes.text();
    console.error("[dj-drop] ElevenLabs error:", ttsRes.status, err);
    return Response.json({ error: "TTS generation failed.", detail: err }, { status: 502 });
  }

  const audioBuffer = await ttsRes.arrayBuffer();
  const base64 = Buffer.from(audioBuffer).toString("base64");
  const dataUrl = `data:audio/mpeg;base64,${base64}`;

  if (trackId) {
    dropCache.set(trackId, { url: dataUrl, ts: Date.now() });
  }

  return Response.json({ url: dataUrl, script, cached: false });
}
