"use client";

import { useState } from "react";

const SEGMENTS = ["station_id", "track_intro", "artist_spotlight", "crowd_energy"] as const;
const LANGUAGES = ["en", "es", "spanglish"] as const;

export function AdminAiHostPilot() {
  const [segment, setSegment] = useState<(typeof SEGMENTS)[number]>("track_intro");
  const [lang, setLang] = useState<(typeof LANGUAGES)[number]>("en");
  const [trackTitle, setTrackTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [vibe, setVibe] = useState("chill");
  const [listenerCount, setListenerCount] = useState("12");
  const [includeChatContext, setIncludeChatContext] = useState(false);
  const [script, setScript] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [status, setStatus] = useState("Ready for a controlled preview.");
  const [loading, setLoading] = useState(false);

  async function preview() {
    setLoading(true);
    setStatus("Generating a preview...");
    setScript("");
    setAudioUrl("");

    try {
      const response = await fetch("/api/radio/dj-drop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segment,
          lang,
          trackTitle: trackTitle || "the next track",
          artist: artist || "an independent artist",
          vibe,
          listenerCount: Number(listenerCount) || undefined,
          includeChatContext,
        }),
      });
      const data = (await response.json()) as { script?: string; url?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Host preview failed.");
      setScript(data.script || "Preview audio returned without script text.");
      setAudioUrl(data.url || "");
      setStatus(data.url ? "Preview ready. Review the script before scheduling it." : "Script ready. Voice preview requires ElevenLabs configuration.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Host preview failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[1.6rem] border border-cyan-300/20 bg-white/[0.03] p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Segment">
            <select value={segment} onChange={(event) => setSegment(event.target.value as (typeof SEGMENTS)[number])} className={INPUT}>
              {SEGMENTS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Language">
            <select value={lang} onChange={(event) => setLang(event.target.value as (typeof LANGUAGES)[number])} className={INPUT}>
              {LANGUAGES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Vibe">
            <input value={vibe} onChange={(event) => setVibe(event.target.value)} className={INPUT} placeholder="chill" />
          </Field>
          <Field label="Listeners">
            <input value={listenerCount} onChange={(event) => setListenerCount(event.target.value)} inputMode="numeric" className={INPUT} />
          </Field>
          <Field label="Track title">
            <input value={trackTitle} onChange={(event) => setTrackTitle(event.target.value)} className={INPUT} placeholder="Mi Fulanita" />
          </Field>
          <Field label="Artist">
            <input value={artist} onChange={(event) => setArtist(event.target.value)} className={INPUT} placeholder="FlowSoundz" />
          </Field>
          <label className="flex items-center gap-3 self-end pb-2 text-sm text-slate-300 md:col-span-2">
            <input type="checkbox" checked={includeChatContext} onChange={(event) => setIncludeChatContext(event.target.checked)} className="h-4 w-4 accent-cyan-300" />
            Include recent chat and crowd energy
          </label>
        </div>
        <button type="button" onClick={() => void preview()} disabled={loading} className="mt-5 rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50">
          {loading ? "Generating..." : "Preview host segment"}
        </button>
        <p className="mt-3 text-sm text-slate-400">{status}</p>
      </div>

      {(script || audioUrl) && (
        <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200/75">Human review required</p>
          <p className="mt-3 text-lg leading-8 text-white">{script}</p>
          {audioUrl ? <audio className="mt-5 w-full" controls src={audioUrl} /> : null}
        </div>
      )}
    </div>
  );
}

const INPUT = "w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-xs text-slate-400"><span className="mb-2 block">{label}</span>{children}</label>;
}
