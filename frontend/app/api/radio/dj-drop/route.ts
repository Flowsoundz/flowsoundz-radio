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

function templateScript(trackTitle: string, artist: string, vibe: string, lang: Lang): string {
  const hype = ["Fuego puro", "Eso es lo que es", "We don't stop", "FlowSoundz all day"][Math.floor(Math.random() * 4)];
  if (lang === "es") return `${hype} — "${trackTitle}" de ${artist} en tu cara. Esto es FlowSoundz Radio.`;
  if (lang === "spanglish") return `${hype} — you're locked in with FlowSoundz Radio. "${trackTitle}" by ${artist}, vibe: ${vibe}. Let's go.`;
  return `You're locked in with FlowSoundz Radio. Up next — "${trackTitle}" by ${artist}. Let it ride.`;
}

async function generateWithClaude(system: string, userPrompt: string): Promise<string> {
  const client = new Anthropic();
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 100,
    system,
    messages: [{ role: "user", content: userPrompt }],
  });
  return (msg.content[0] as { text: string }).text.trim();
}

async function generateWithOpenAI(system: string, userPrompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 100,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content.trim();
}

async function generateWithGemini(system: string, userPrompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: 100 },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = (await res.json()) as { candidates: { content: { parts: { text: string }[] } }[] };
  return data.candidates[0].content.parts[0].text.trim();
}

async function generateScript(context: {
  trackTitle: string;
  artist: string;
  vibe: string;
  lang: Lang;
  listenerCount?: number;
}): Promise<string> {
  const { trackTitle, artist, vibe, lang, listenerCount } = context;

  const system = SYSTEM_PROMPTS[lang];
  const userPrompt =
    lang === "es"
      ? `Presenta "${trackTitle}" de ${artist}. Vibe: ${vibe}.${listenerCount ? ` ${listenerCount} personas están escuchando ahora.` : ""} Dale candela.`
      : `Introduce "${trackTitle}" by ${artist}. Vibe: ${vibe}.${listenerCount ? ` ${listenerCount} people are listening right now.` : ""} Make it hit.`;

  if (process.env.ANTHROPIC_API_KEY) {
    try { return await generateWithClaude(system, userPrompt); } catch (e) {
      console.warn("[dj-drop] Claude failed, trying OpenAI:", e);
    }
  }

  if (process.env.OPENAI_API_KEY) {
    try { return await generateWithOpenAI(system, userPrompt); } catch (e) {
      console.warn("[dj-drop] OpenAI failed, trying Gemini:", e);
    }
  }

  if (process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    try { return await generateWithGemini(system, userPrompt); } catch (e) {
      console.warn("[dj-drop] Gemini failed, using template:", e);
    }
  }

  return templateScript(trackTitle, artist, vibe, lang);
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
    console.error("[dj-drop] Claude script error (using template fallback):", err);
    script = templateScript(trackTitle, artist, vibe, lang);
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
