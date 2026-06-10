"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import Link from "next/link";

type Artist = { id: string; name: string; slug: string };

const VIBES = ["Chill", "Hype", "Late Night", "Emotional", "Unsure"] as const;

export default function AddSongPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artistId, setArtistId] = useState("");
  const [newArtistName, setNewArtistName] = useState("");
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [vibe, setVibe] = useState<string>("Chill");
  const [audioUrl, setAudioUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [durationSec, setDurationSec] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isVault, setIsVault] = useState(false);
  const [isExplicit, setIsExplicit] = useState(false);
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ id: string; title: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/admin/songs")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { songs: Array<{ artist: Artist; id: string }> } | null) => {
        if (!d) return;
        const map = new Map<string, Artist>();
        for (const s of d.songs) map.set(s.artist.id, s.artist);
        setArtists([...map.values()]);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(null);
    try {
      const res = await fetch("/api/admin/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: artistId || undefined,
          newArtistName: newArtistName || undefined,
          title,
          genre,
          vibe,
          audioUrl,
          coverUrl: coverUrl || undefined,
          durationSec: durationSec ? Number(durationSec) : undefined,
          isFeatured,
          isVault,
          isExplicit,
          isAiGenerated,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; song?: { id: string; title: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSaved({ id: data.song!.id, title: data.song!.title });
      setTitle(""); setGenre(""); setAudioUrl(""); setCoverUrl(""); setDurationSec("");
      setNewArtistName(""); setArtistId("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#00e5ff]/40";
  const labelCls = "block text-xs font-semibold uppercase tracking-[0.15em] text-slate-400 mb-1.5";

  return (
    <AppShell eyebrow="Admin" title="Add Song">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="text-xs text-slate-400 hover:text-white transition">
          ← Admin
        </Link>
      </div>

      {saved && (
        <div className="mb-6 rounded-[1.4rem] border border-emerald-400/20 bg-emerald-400/[0.06] px-5 py-4">
          <p className="text-sm font-semibold text-emerald-300">Added: &ldquo;{saved.title}&rdquo;</p>
          <p className="text-xs text-slate-400 mt-1">ID: <code className="font-mono text-slate-300">{saved.id}</code></p>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-[1.4rem] border border-red-400/20 bg-red-400/[0.06] px-5 py-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5 rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 p-6">
        {/* Artist */}
        <div>
          <label className={labelCls}>Artist</label>
          {artists.length > 0 && (
            <select
              value={artistId}
              onChange={(e) => { setArtistId(e.target.value); if (e.target.value) setNewArtistName(""); }}
              className={inputCls + " mb-2"}
            >
              <option value="">— Select existing artist —</option>
              {artists.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}
          <input
            type="text"
            value={newArtistName}
            onChange={(e) => { setNewArtistName(e.target.value); if (e.target.value) setArtistId(""); }}
            placeholder="Or type new artist name"
            className={inputCls}
          />
        </div>

        {/* Title */}
        <div>
          <label className={labelCls}>Song Title *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className={inputCls} placeholder="e.g. Late Nights" />
        </div>

        {/* Genre + Vibe */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Genre *</label>
            <input type="text" value={genre} onChange={(e) => setGenre(e.target.value)} required className={inputCls} placeholder="e.g. R&B, Hip-Hop" />
          </div>
          <div>
            <label className={labelCls}>Vibe</label>
            <select value={vibe} onChange={(e) => setVibe(e.target.value)} className={inputCls}>
              {VIBES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        {/* Audio URL */}
        <div>
          <label className={labelCls}>Audio URL *</label>
          <input type="url" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} required className={inputCls} placeholder="https://..." />
        </div>

        {/* Cover URL + Duration */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Cover Art URL</label>
            <input type="url" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} className={inputCls} placeholder="https://..." />
          </div>
          <div>
            <label className={labelCls}>Duration (seconds)</label>
            <input type="number" min="1" value={durationSec} onChange={(e) => setDurationSec(e.target.value)} className={inputCls} placeholder="e.g. 213" />
          </div>
        </div>

        {/* Flags */}
        <div className="flex flex-wrap gap-4">
          {[
            { label: "Featured ★", val: isFeatured, set: setIsFeatured },
            { label: "Vault 🔒", val: isVault, set: setIsVault },
            { label: "Explicit 🔞", val: isExplicit, set: setIsExplicit },
            { label: "AI-Generated 🤖", val: isAiGenerated, set: setIsAiGenerated },
          ].map(({ label, val, set }) => (
            <label key={label} className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={val}
                onChange={(e) => set(e.target.checked)}
                className="h-4 w-4 rounded accent-cyan-400"
              />
              {label}
            </label>
          ))}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-2xl bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] py-3 text-sm font-bold text-white shadow-[0_0_18px_rgba(0,229,255,0.2)] transition hover:shadow-[0_0_28px_rgba(0,229,255,0.35)] disabled:opacity-50"
        >
          {saving ? "Adding..." : "Add Song to Catalog"}
        </button>
      </form>
    </AppShell>
  );
}
