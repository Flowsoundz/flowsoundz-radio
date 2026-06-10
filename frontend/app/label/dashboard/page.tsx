"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

type ArtistRow = {
  id: string;
  name: string;
  slug: string;
  totalPlays: number;
};

type Label = {
  id: string;
  name: string;
  tier: "STARTER" | "PRO";
  maxArtists: number;
  artists: {
    artist: {
      id: string;
      name: string;
      slug: string;
      songs: { queuePreferences: { playCount: number } | null }[];
    };
  }[];
};

export default function LabelDashboardPage() {
  const [label, setLabel] = useState<Label | null>(null);
  const [loading, setLoading] = useState(true);
  const [addEmail, setAddEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/label");
      const data = (await res.json()) as { label?: Label | null };
      setLabel(data.label ?? null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function addArtist() {
    if (!addEmail.trim()) return;
    setAdding(true);
    setAddError("");
    setAddSuccess("");
    try {
      const res = await fetch("/api/label/artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistEmail: addEmail.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to add artist.");
      setAddEmail("");
      setAddSuccess("Artist added to your roster.");
      void load();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Error adding artist.");
    } finally {
      setAdding(false);
    }
  }

  async function removeArtist(artistId: string) {
    await fetch(`/api/label/artists?artistId=${artistId}`, { method: "DELETE" });
    void load();
  }

  if (loading) {
    return (
      <AppShell eyebrow="Label" title="Dashboard">
        <p className="text-xs text-slate-500">Loading…</p>
      </AppShell>
    );
  }

  if (!label) {
    return (
      <AppShell eyebrow="Label" title="Dashboard">
        <div className="rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 p-12 text-center">
          <p className="mb-1 text-sm font-semibold text-white">No label account found</p>
          <p className="mb-6 text-xs text-slate-500">Create a label profile to manage multiple artists from one dashboard.</p>
          <Link href="/label/register" className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#a855f7_0%,#ec4899_100%)] px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_18px_rgba(168,85,247,0.3)] transition hover:shadow-[0_0_28px_rgba(168,85,247,0.5)]">
            Create Label Profile
          </Link>
        </div>
      </AppShell>
    );
  }

  const artists: ArtistRow[] = label.artists.map(({ artist }) => ({
    id: artist.id,
    name: artist.name,
    slug: artist.slug,
    totalPlays: artist.songs.reduce((s, song) => s + (song.queuePreferences?.playCount ?? 0), 0),
  }));

  artists.sort((a, b) => b.totalPlays - a.totalPlays);

  const totalPlays = artists.reduce((s, a) => s + a.totalPlays, 0);
  const slotsUsed = artists.length;
  const slotsTotal = label.maxArtists;

  return (
    <AppShell eyebrow="Label & Agency" title={label.name}>
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Link href="/" className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 transition hover:border-white/20 hover:text-white">
          ← Home
        </Link>
        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${label.tier === "PRO" ? "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-300" : "border-cyan-400/25 bg-cyan-400/10 text-cyan-300"}`}>
          {label.tier} Plan
        </span>
        <span className="text-xs text-slate-500">{slotsUsed} / {slotsTotal} artists</span>
      </div>

      {/* Summary */}
      <section className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Artists", value: artists.length, accent: "text-fuchsia-300" },
          { label: "Total Plays", value: totalPlays.toLocaleString(), accent: "text-cyan-300" },
          { label: "Slots Left", value: slotsTotal - slotsUsed, accent: slotsUsed >= slotsTotal ? "text-red-400" : "text-emerald-300" },
        ].map(({ label, value, accent }) => (
          <div key={label} className="flex flex-col gap-1 rounded-[1.6rem] border border-white/8 bg-[#0B1020]/80 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
            <p className={`text-3xl font-bold leading-none ${accent}`}>{value}</p>
          </div>
        ))}
      </section>

      {/* Roster table */}
      <section className="mb-6 overflow-hidden rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80">
        <div className="border-b border-white/[0.05] px-6 py-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Roster · {artists.length} artists</h2>
        </div>
        {artists.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-slate-500">No artists yet. Add your first artist below.</p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {artists.map((artist, i) => (
              <div key={artist.id} className="flex items-center gap-4 px-6 py-4">
                <span className="w-5 shrink-0 text-xs tabular-nums text-slate-600">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <Link href={`/artists/${artist.slug}`} className="text-sm font-semibold text-white hover:text-cyan-300 transition truncate block">
                    {artist.name}
                  </Link>
                </div>
                <span className="text-xs tabular-nums text-slate-400">{artist.totalPlays.toLocaleString()} plays</span>
                <div className="flex gap-2">
                  <Link href={`/artist/my-stats`} className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-slate-400 transition hover:border-white/20 hover:text-white">
                    Stats
                  </Link>
                  <button type="button" onClick={() => void removeArtist(artist.id)}
                    className="rounded-full border border-red-400/20 px-2.5 py-1 text-[10px] text-red-400/60 transition hover:border-red-400/40 hover:text-red-300">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add artist */}
      {slotsUsed < slotsTotal && (
        <div className="rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 p-5">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Add Artist to Roster</h3>
          <div className="flex gap-3">
            <input
              type="email"
              placeholder="Artist's registered email on FlowSoundz"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void addArtist(); }}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-fuchsia-400/40 focus:outline-none"
            />
            <button type="button" onClick={() => void addArtist()} disabled={adding || !addEmail.trim()}
              className="shrink-0 rounded-full bg-[linear-gradient(135deg,#a855f7_0%,#ec4899_100%)] px-4 py-2 text-sm font-bold text-white transition disabled:opacity-50">
              {adding ? "Adding…" : "Add"}
            </button>
          </div>
          {addError && <p className="mt-2 text-xs text-red-400">{addError}</p>}
          {addSuccess && <p className="mt-2 text-xs text-emerald-400">{addSuccess}</p>}
          <p className="mt-2 text-xs text-slate-600">The artist must have an account on FlowSoundz with an artist profile linked to their email.</p>
        </div>
      )}

      {slotsUsed >= slotsTotal && (
        <div className="rounded-[1.6rem] border border-amber-400/15 bg-amber-400/[0.04] p-4 text-center">
          <p className="text-xs text-slate-400">
            Roster full ({slotsTotal}/{slotsTotal}).{" "}
            <Link href="/contact" className="text-fuchsia-400 underline hover:text-fuchsia-300">Upgrade to Pro</Link> to add up to 20 artists.
          </p>
        </div>
      )}
    </AppShell>
  );
}
