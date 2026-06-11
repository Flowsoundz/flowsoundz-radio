"use client";

import { useState } from "react";

const VIBES = [
  { value: "HYPE", label: "Hype" },
  { value: "CHILL", label: "Chill" },
  { value: "LATE_NIGHT", label: "Late Night" },
  { value: "EMOTIONAL", label: "Emotional" },
] as const;

type Result =
  | { kind: "ok"; title: string; id: string }
  | { kind: "err"; message: string };

export function AdminIngestPanel() {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("FlowSoundz");
  const [genre, setGenre] = useState("");
  const [vibe, setVibe] = useState<string>("HYPE");
  const [sourceAudioUrl, setSourceAudioUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const canSubmit = title.trim() && /^https?:\/\//.test(sourceAudioUrl.trim()) && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, artist, genre, vibe, sourceAudioUrl }),
      });
      const data = (await res.json()) as { song?: { id: string; title: string }; error?: string };
      if (!res.ok || !data.song) {
        setResult({ kind: "err", message: data.error ?? `Failed (${res.status})` });
      } else {
        setResult({ kind: "ok", title: data.song.title, id: data.song.id });
        setTitle("");
        setGenre("");
        setSourceAudioUrl("");
      }
    } catch (err) {
      setResult({ kind: "err", message: err instanceof Error ? err.message : "Network error" });
    } finally {
      setSubmitting(false);
    }
  }

  const field =
    "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-[#00E5FF]/50";

  return (
    <section className="glass-card rounded-[1.8rem] border border-[#00E5FF]/15 p-6">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#00E5FF]">
          Master from URL
        </span>
        <span className="rounded-full border border-[#00FF88]/25 bg-[#00FF88]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#00FF88]">
          Auto Loudness
        </span>
      </div>
      <p className="mb-5 text-xs leading-5 text-white/55">
        Paste a Suno / Udio export (or any direct audio URL). The mastering worker
        normalizes it to broadcast loudness, reads its exact duration, and publishes
        a radio-ready master — no manual mixing.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Source audio URL
          </label>
          <input
            className={field}
            value={sourceAudioUrl}
            onChange={(e) => setSourceAudioUrl(e.target.value)}
            placeholder="https://cdn1.suno.ai/....mp3"
            inputMode="url"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Title
          </label>
          <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Track title" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Artist
          </label>
          <input className={field} value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artist name" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Vibe
          </label>
          <select className={field} value={vibe} onChange={(e) => setVibe(e.target.value)}>
            {VIBES.map((v) => (
              <option key={v.value} value={v.value} className="bg-[#0B1020]">
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Genre <span className="text-white/25">(optional)</span>
          </label>
          <input className={field} value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Reggaeton, R&B…" />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="rounded-full bg-gradient-to-r from-[#00E5FF] to-[#00FF88] px-5 py-2.5 text-sm font-bold text-black transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Queuing…" : "Queue for Mastering"}
        </button>
        {result?.kind === "ok" ? (
          <span className="text-xs text-[#00FF88]">
            ✓ Queued “{result.title}” — mastering in progress. It goes live when ready.
          </span>
        ) : result?.kind === "err" ? (
          <span className="text-xs text-rose-300">✕ {result.message}</span>
        ) : null}
      </div>
    </section>
  );
}
