"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SongGrid } from "@/components/SongGrid";
import { getSongs } from "@/lib/api";
import type { Song } from "@/lib/types";

const VIBE_TABS = [
  { label: "All", value: "all" },
  { label: "Chill", value: "chill" },
  { label: "Hype", value: "hype" },
  { label: "Late Night", value: "late_night" },
  { label: "Emotional", value: "emotional" },
  { label: "AI Made", value: "ai_generated" },
];

export default function SongsPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [vibeFilter, setVibeFilter] = useState("all");

  useEffect(() => {
    const loadSongs = async () => {
      try {
        setLoading(true);
        setError(null);
        setSongs(await getSongs());
      } catch (err) {
        setError(
          err instanceof Error
            ? `Catalog backend offline. Start the API at http://127.0.0.1:8000 and refresh.`
            : "Catalog backend offline. Start the API at http://127.0.0.1:8000 and refresh.",
        );
      } finally {
        setLoading(false);
      }
    };
    void loadSongs();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return songs.filter((s) => {
      const matchesVibe =
        vibeFilter === "all"
          ? true
          : vibeFilter === "ai_generated"
            ? Boolean(s.is_ai_generated)
            : s.vibe === vibeFilter;
      const matchesQuery =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        (s.vibe ?? "").toLowerCase().includes(q) ||
        (s.ai_platform ?? "").toLowerCase().includes(q);
      return matchesVibe && matchesQuery;
    });
  }, [songs, query, vibeFilter]);

  return (
    <AppShell
      eyebrow="Catalog"
      title="Station Catalog"
      subtitle={
        loading
          ? "Loading tracks..."
          : `${songs.length} track${songs.length !== 1 ? "s" : ""} in rotation`
      }
    >
      {/* ── Membership upsell ── */}
      <div
        className="mb-6 rounded-[1.9rem] p-px"
        style={{ background: "linear-gradient(135deg, #00e5ff 0%, #7c4dff 100%)" }}
      >
        <div className="rounded-[calc(1.9rem-1px)] bg-[#07111f] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
            Membership
          </p>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold text-white">
                Unlock the full catalog
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Day One Access, Vault exclusives, Behind the Mix notes, and
                Midnight Drops — none of it lives in the public lane.
              </p>
            </div>
            <Link
              href="/membership"
              className="inline-flex shrink-0 min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_18px_rgba(0,229,255,0.35)] transition hover:shadow-[0_0_28px_rgba(0,229,255,0.55)]"
            >
              Explore membership
            </Link>
          </div>
        </div>
      </div>

      {/* ── Search + sticky vibe filters ── */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 bg-[#07111f]/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 pb-3 pt-2">
        {/* Search bar */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tracks, artists, vibes..."
          className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-[#00e5ff]/60 focus:ring-1 focus:ring-[#00e5ff]/30"
        />

        {/* Vibe filter tabs */}
        <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-none">
          {VIBE_TABS.map((tab) => {
            const isAI = tab.value === "ai_generated";
            const isActive = vibeFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setVibeFilter(tab.value)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? isAI
                      ? "bg-[linear-gradient(135deg,#7c4dff,#ff3df2)] text-white shadow-[0_0_14px_rgba(124,77,255,0.45)]"
                      : "bg-[linear-gradient(135deg,#00e5ff,#7c4dff)] text-white shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                    : isAI
                      ? "border border-fuchsia-400/25 text-fuchsia-300/70 hover:border-fuchsia-400/50 hover:text-fuchsia-200"
                      : "border border-white/10 text-white/50 hover:border-white/20 hover:text-white/80"
                }`}
              >
                {isAI ? "✦ " : ""}{tab.label}
              </button>
            );
          })}
          {!loading && (
            <span className="ml-auto shrink-0 self-center text-xs text-white/25">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* ── Song grid ── */}
      <div className="mt-4">
        <SongGrid songs={filtered} isLoading={loading} error={error} />
      </div>
    </AppShell>
  );
}
