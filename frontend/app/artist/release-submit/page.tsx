"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

const GENRES = [
  "Hip-Hop", "R&B", "Soul", "Jazz", "Electronic", "Afrobeats",
  "Pop", "Alternative", "Indie", "Lo-Fi", "Funk", "Other",
];

type ProductionMethod = "self_produced" | "ai_assisted" | "ai_generated";

const PRODUCTION_OPTIONS: { id: ProductionMethod; label: string; description: string }[] = [
  { id: "self_produced",  label: "Self-produced",  description: "Live instruments, DAW, or original recording — fully yours." },
  { id: "ai_assisted",   label: "AI-assisted",    description: "I wrote the melody, lyrics & creative direction. AI tools were used in production." },
  { id: "ai_generated",  label: "AI-generated",   description: "Track primarily generated from AI prompts (Suno, Udio, etc.)." },
];

type Field = {
  artistName: string; trackTitle: string; genre: string;
  releaseDate: string; email: string; notes: string;
  lyrics: string;
  productionMethod: ProductionMethod;
};

const EMPTY: Field = {
  artistName: "", trackTitle: "", genre: "", releaseDate: "", email: "", notes: "",
  lyrics: "",
  productionMethod: "self_produced",
};

export default function ReleaseSubmitPage() {
  const [fields, setFields] = useState<Field>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [extractStatus, setExtractStatus] = useState<"idle" | "found" | "none">("idle");
  const [lastFile, setLastFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function set(key: keyof Field, val: string) {
    setFields((f) => ({ ...f, [key]: val }));
  }

  async function handleMp3Pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLastFile(file);
    setExtracting(true);
    setExtractStatus("idle");
    try {
      const { parseBlob } = await import("music-metadata");
      const meta = await parseBlob(file, { skipCovers: true });
      const raw = meta.common.lyrics;
      let text = "";
      if (Array.isArray(raw) && raw.length > 0) {
        const entry = raw[0];
        text = typeof entry === "string" ? entry : ((entry as { text?: string })?.text ?? "");
      }
      if (text.trim()) {
        set("lyrics", text.trim());
        setExtractStatus("found");
      } else {
        setExtractStatus("none");
      }
    } catch {
      setExtractStatus("none");
    } finally {
      setExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleTranscribe() {
    const file = lastFile;
    if (!file) return;
    setTranscribing(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/transcribe-lyrics", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Transcription failed.");
      }
      const { transcript } = await res.json() as { transcript: string };
      if (transcript.trim()) {
        set("lyrics", transcript.trim());
        setExtractStatus("found");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transcription failed.");
    } finally {
      setTranscribing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fields.artistName || !fields.trackTitle || !fields.email) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/release-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artist_name: fields.artistName,
          track_title: fields.trackTitle,
          genre: fields.genre || "Other",
          release_date: fields.releaseDate || new Date().toISOString().slice(0, 10),
          email: fields.email,
          notes: fields.notes || undefined,
          lyrics: fields.lyrics || undefined,
          production_method: fields.productionMethod,
        }),
      });
      if (!res.ok) throw new Error("Submission failed. Try again.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#050816] px-4">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute left-1/3 top-1/4 h-96 w-96 rounded-full bg-[#00e5ff]/5 blur-[120px]" />
        </div>
        <div className="relative z-10 w-full max-w-sm text-center">
          <div className="mb-8 flex justify-center"><BrandLogo variant="full" /></div>
          <div className="rounded-[2rem] border border-cyan-400/20 bg-[#0B1020]/90 p-8">
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-400/10 ring-1 ring-cyan-400/25">
                <svg className="h-7 w-7 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
            <h1 className="text-xl font-semibold text-white">Submission received</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              We got your release. Our team reviews every submission and will reach out to <span className="font-medium text-white">{fields.email}</span> with next steps.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link href="/radio" className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-6 py-3 text-sm font-bold text-white">
                Back to radio
              </Link>
              <button type="button" onClick={() => { setFields(EMPTY); setDone(false); }} className="text-xs text-slate-500 hover:text-slate-400">
                Submit another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] px-4 py-12">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/3 top-1/4 h-96 w-96 rounded-full bg-[#00e5ff]/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 h-96 w-96 rounded-full bg-[#7c4dff]/6 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-lg">
        <div className="mb-8 flex justify-center"><BrandLogo variant="full" /></div>

        <div className="rounded-[2rem] border border-white/8 bg-[#0B1020]/90 p-8 shadow-[0_0_60px_rgba(0,0,0,0.4)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">Quick Intake</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Register your release</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            A lightweight form to log your release with FlowSoundz — no song link required. For the full submission with AI promo assets and curation review, use the <Link href="/artist/submit" className="text-cyan-400 hover:text-cyan-300">Creator Hub submission flow</Link>.
          </p>

          {error && (
            <div className="mt-4 rounded-[1.1rem] border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-xs text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Artist name *</label>
                <input
                  type="text" required value={fields.artistName}
                  onChange={(e) => set("artistName", e.target.value)}
                  placeholder="Your artist name"
                  className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Track title *</label>
                <input
                  type="text" required value={fields.trackTitle}
                  onChange={(e) => set("trackTitle", e.target.value)}
                  placeholder="Track name"
                  className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white/20"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Genre</label>
                <select
                  value={fields.genre} onChange={(e) => set("genre", e.target.value)}
                  className="rounded-[1.1rem] border border-white/10 bg-[#0B1020] px-4 py-3 text-sm text-white outline-none focus:border-white/20"
                >
                  <option value="">Select genre</option>
                  {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Release date</label>
                <input
                  type="date" value={fields.releaseDate}
                  onChange={(e) => set("releaseDate", e.target.value)}
                  className="rounded-[1.1rem] border border-white/10 bg-[#0B1020] px-4 py-3 text-sm text-white outline-none focus:border-white/20"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Email *</label>
              <input
                type="email" required value={fields.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="your@email.com"
                className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Notes / streaming link</label>
              <textarea
                value={fields.notes} onChange={(e) => set("notes", e.target.value)}
                rows={3} placeholder="SoundCloud, Spotify, or any context about the track..."
                className="resize-none rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-400">Lyrics <span className="font-normal text-slate-600">(optional)</span></label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={extracting}
                  className="flex items-center gap-1.5 rounded-full border border-[#8B5CF6]/25 bg-[#8B5CF6]/10 px-3 py-1 text-[10px] font-semibold text-[#c4b5fd] transition hover:bg-[#8B5CF6]/18 disabled:opacity-50"
                >
                  {extracting ? "Reading file…" : "Extract from MP3"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/mpeg,.mp3"
                  className="hidden"
                  onChange={(e) => void handleMp3Pick(e)}
                />
              </div>
              <textarea
                value={fields.lyrics}
                onChange={(e) => set("lyrics", e.target.value)}
                rows={6}
                placeholder={"Verse 1\n...\n\nChorus\n...\n\nPaste or type your lyrics here. Use blank lines to separate sections."}
                className="resize-y rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-white/20"
              />
              {extractStatus === "found" && (
                <p className="text-[10px] text-emerald-400/80">Lyrics extracted — edit freely.</p>
              )}
              {extractStatus === "none" && (
                <div className="flex items-center gap-3">
                  <p className="text-[10px] text-slate-500">No lyrics in file metadata.</p>
                  <button
                    type="button"
                    onClick={() => void handleTranscribe()}
                    disabled={transcribing}
                    className="flex items-center gap-1.5 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold text-cyan-300 transition hover:bg-cyan-400/18 disabled:opacity-50"
                  >
                    {transcribing ? "Transcribing…" : "Transcribe with AI"}
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-400">Production method *</label>
              <div className="flex flex-col gap-2">
                {PRODUCTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => set("productionMethod", opt.id)}
                    className={`flex items-start gap-3 rounded-[1.1rem] border px-4 py-3 text-left transition ${
                      fields.productionMethod === opt.id
                        ? "border-cyan-400/40 bg-cyan-400/[0.07]"
                        : "border-white/10 bg-white/[0.02] hover:border-white/18"
                    }`}
                  >
                    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      fields.productionMethod === opt.id
                        ? "border-cyan-400 bg-cyan-400"
                        : "border-white/20 bg-transparent"
                    }`}>
                      {fields.productionMethod === opt.id && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#050816]" />
                      )}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-white">{opt.label}</p>
                      <p className="mt-0.5 text-[11px] leading-5 text-slate-500">{opt.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit" disabled={loading || !fields.artistName || !fields.trackTitle || !fields.email}
              className="mt-2 w-full rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] py-3 text-sm font-bold text-white shadow-[0_0_22px_rgba(0,229,255,0.28)] transition disabled:opacity-40 hover:shadow-[0_0_32px_rgba(0,229,255,0.45)]"
            >
              {loading ? "Submitting…" : "Submit release"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-600">
            By submitting you confirm you own or have rights to this music.
          </p>
        </div>

        <p className="mt-6 text-center text-xs">
          <Link href="/artist/dashboard" className="text-slate-500 transition hover:text-slate-400">
            ← Back to Creator Hub
          </Link>
        </p>
      </div>
    </div>
  );
}
