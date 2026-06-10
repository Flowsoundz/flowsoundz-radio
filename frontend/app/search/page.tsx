"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

const VIBE_COLOR: Record<string, string> = {
  CHILL: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
  HYPE: "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-200",
  LATE_NIGHT: "border-violet-400/25 bg-violet-400/10 text-violet-200",
  EMOTIONAL: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  UNSURE: "border-slate-400/25 bg-slate-400/10 text-slate-300",
};

type SongResult = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  artistSlug: string;
  genre: string;
  vibe: string;
  coverUrl: string | null;
  isFeatured: boolean;
  isVault: boolean;
  playCount: number;
};

type ArtistResult = {
  id: string;
  name: string;
  slug: string;
  artistType: string | null;
  bio: string | null;
  heroImageUrl: string | null;
  statement: string | null;
  songCount: number;
};

export default function SearchPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [songs, setSongs] = useState<SongResult[]>([]);
  const [artists, setArtists] = useState<ArtistResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushQuery(q: string) {
    const url = new URL(window.location.href);
    if (q) url.searchParams.set("q", q);
    else url.searchParams.delete("q");
    router.replace(url.toString(), { scroll: false });
  }

  useEffect(() => {
    const q = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setSongs([]); setArtists([]); return; }

    debounceRef.current = setTimeout(() => {
      setLoading(true);
      void fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { songs: SongResult[]; artists: ArtistResult[] } | null) => {
          if (d) { setSongs(d.songs); setArtists(d.artists); }
        })
        .finally(() => setLoading(false));
    }, 220);
  }, [query]);

  const hasResults = songs.length > 0 || artists.length > 0;
  const showEmpty = query.trim().length >= 2 && !loading && !hasResults;

  return (
    <AppShell eyebrow="Search" title="Search">
      <div className="mb-6">
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => { setQuery(e.target.value); pushQuery(e.target.value); }}
          placeholder="Songs, artists, genres..."
          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-base text-white outline-none placeholder:text-slate-500 focus:border-[#00e5ff]/40 focus:ring-1 focus:ring-[#00e5ff]/20 transition"
        />
      </div>

      {loading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-[1.4rem] border border-white/5 bg-white/[0.03]" />
          ))}
        </div>
      )}

      {showEmpty && (
        <div className="rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 px-8 py-10 text-center">
          <p className="text-sm text-slate-400">No results for &ldquo;{query}&rdquo;</p>
          <p className="mt-2 text-xs text-slate-600">Try a different artist name, song title, or genre.</p>
        </div>
      )}

      {!loading && artists.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Artists · {artists.length}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {artists.map((a) => (
              <Link
                key={a.id}
                href={`/artists/${a.slug}`}
                className="flex items-center gap-3 rounded-[1.4rem] border border-white/8 bg-[#0B1020]/80 px-4 py-3.5 transition hover:border-white/15 hover:bg-white/[0.05]"
              >
                {a.heroImageUrl ? (
                  <img
                    src={a.heroImageUrl}
                    alt={a.name}
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/8 text-lg">
                    🎤
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{a.name}</p>
                  <p className="text-xs text-slate-400">
                    {a.artistType ?? "Artist"} · {a.songCount} track{a.songCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!loading && songs.length > 0 && (
        <section>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Tracks · {songs.length}
          </h2>
          <div className="flex flex-col gap-2">
            {songs.map((s) => {
              const vibeKey = s.vibe.toUpperCase().replace(" ", "_");
              return (
                <Link
                  key={s.id}
                  href={`/songs/${s.slug}`}
                  className="flex items-center gap-3 rounded-[1.4rem] border border-white/8 bg-[#0B1020]/80 px-4 py-3 transition hover:border-white/14"
                >
                  {s.coverUrl ? (
                    <img src={s.coverUrl} alt={s.title} className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/8 text-lg">🎵</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {s.isFeatured && <span className="mr-1 text-[10px] text-amber-400">★</span>}
                      {s.title}
                      {s.isVault && (
                        <span className="ml-1.5 rounded-full border border-fuchsia-400/25 bg-fuchsia-400/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-fuchsia-300">Vault</span>
                      )}
                    </p>
                    <Link href={`/artists/${s.artistSlug}`} className="text-xs text-slate-400 hover:text-slate-200 transition">
                      {s.artist}
                    </Link>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${VIBE_COLOR[vibeKey] ?? VIBE_COLOR.UNSURE}`}
                    >
                      {s.vibe.toLowerCase().replace("_", " ")}
                    </span>
                    {s.playCount > 0 && (
                      <span className="text-[10px] tabular-nums text-slate-600">{s.playCount}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {query.trim().length < 2 && !loading && (
        <div className="rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 px-8 py-10 text-center">
          <p className="text-sm text-slate-500">Type at least 2 characters to search.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {["Chill", "Hype", "R&B", "Hip-Hop", "Late Night"].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => { setQuery(tag); pushQuery(tag); }}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:border-white/20 hover:text-white"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
