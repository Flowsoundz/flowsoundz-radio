"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

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
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setUploadPct(0);
    setResult(null);
    try {
      const blob = await upload(`sources/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/blob-upload",
        onUploadProgress: ({ percentage }) => setUploadPct(Math.round(percentage)),
      });
      setSourceAudioUrl(blob.url);
      if (!title.trim()) {
        setTitle(file.name.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " "));
      }
    } catch (err) {
      setResult({ kind: "err", message: err instanceof Error ? err.message : "Upload failed." });
    } finally {
      setUploading(false);
    }
  }

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
        Paste any Suno / Udio link — <span className="text-white/75">share links are fine</span>, we
        resolve them automatically — or upload the audio file directly. The mastering worker
        normalizes it to broadcast loudness, reads its exact duration, and publishes a
        radio-ready master. No manual mixing.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Source audio — link or file
          </label>
          <div className="flex gap-2">
            <input
              className={field}
              value={sourceAudioUrl}
              onChange={(e) => setSourceAudioUrl(e.target.value)}
              placeholder="https://suno.com/s/… or any audio URL"
              inputMode="url"
              disabled={uploading}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="shrink-0 rounded-xl border border-[#00E5FF]/30 bg-[#00E5FF]/10 px-4 py-2.5 text-xs font-bold text-[#00E5FF] transition hover:bg-[#00E5FF]/18 disabled:opacity-50"
            >
              {uploading ? `Uploading ${uploadPct}%` : "Upload file"}
            </button>
          </div>
          {uploading ? (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#00E5FF] to-[#00FF88] transition-all"
                style={{ width: `${uploadPct}%` }}
              />
            </div>
          ) : null}
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
