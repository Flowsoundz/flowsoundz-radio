"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

const GENRES = [
  "Hip-Hop", "R&B", "Soul", "Jazz", "Electronic", "Afrobeats",
  "Pop", "Alternative", "Indie", "Lo-Fi", "Funk", "Other",
];

type Field = {
  artistName: string; trackTitle: string; genre: string;
  releaseDate: string; email: string; notes: string;
};

const EMPTY: Field = {
  artistName: "", trackTitle: "", genre: "", releaseDate: "", email: "", notes: "",
};

export default function ReleaseSubmitPage() {
  const [fields, setFields] = useState<Field>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function set(key: keyof Field, val: string) {
    setFields((f) => ({ ...f, [key]: val }));
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">Release Submission</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Submit your release</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Submit your track for FlowSoundz Radio rotation. We review every submission and respond within 5–7 days.
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
