import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Whisper has a 25 MB file limit
const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Transcription unavailable." }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (25 MB max)." }, { status: 413 });
  }

  // Forward to Whisper
  // verbose_json gives segment timestamps so the promo video can sync each
  // lyric line to the audio.
  const whisperForm = new FormData();
  whisperForm.append("file", file, (file as File).name ?? "track.mp3");
  whisperForm.append("model", "whisper-1");
  whisperForm.append("response_format", "verbose_json");

  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: whisperForm,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[transcribe-lyrics] Whisper error", res.status, detail);
      return NextResponse.json({ error: "Transcription failed." }, { status: 502 });
    }

    const data = (await res.json()) as {
      text?: string;
      segments?: Array<{ start: number; text: string }>;
    };
    const lines = (data.segments ?? [])
      .map((s) => ({ text: s.text.trim(), start: Math.max(0, s.start) }))
      .filter((l) => l.text.length > 0);

    return NextResponse.json({ transcript: (data.text ?? "").trim(), lines });
  } catch (err) {
    console.error("[transcribe-lyrics]", err);
    return NextResponse.json({ error: "Transcription failed." }, { status: 500 });
  }
}
