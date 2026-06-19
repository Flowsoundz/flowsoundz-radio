import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { readCatalogSnapshotFromStore } from "@/lib/catalogSnapshotStore";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/siteUrl";
import { getUpcomingAirings, formatAiring } from "@/lib/airTime";
import { normalizeStationSong } from "@/lib/stationPlayback";
import { FollowButton } from "@/components/FollowButton";
import { CopyEmbedCode } from "@/components/CopyEmbedCode";
import FavoriteButton from "@/components/FavoriteButton";

const VIBE_COLOR: Record<string, string> = {
  CHILL:      "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
  HYPE:       "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-200",
  LATE_NIGHT: "border-violet-400/25 bg-violet-400/10 text-violet-200",
  EMOTIONAL:  "border-amber-400/25 bg-amber-400/10 text-amber-200",
  UNSURE:     "border-slate-400/25 bg-slate-400/10 text-slate-300",
};

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const song = await prisma.song.findUnique({
    where: { slug },
    select: {
      title: true,
      vibe: true,
      coverUrl: true,
      artist: { select: { name: true } },
    },
  });
  if (!song) return { title: "Song Not Found" };

  const siteUrl = getSiteUrl();
  const ogImage = `${siteUrl}/api/og/track?title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist.name)}&vibe=${encodeURIComponent(song.vibe.toLowerCase())}&cover=${encodeURIComponent(song.coverUrl ?? "")}`;

  return {
    title: `${song.title} — ${song.artist.name} · FlowSoundz Radio`,
    description: `Listen to "${song.title}" by ${song.artist.name} on FlowSoundz Radio.`,
    openGraph: {
      title: `${song.title} — ${song.artist.name}`,
      description: `Now on FlowSoundz Radio`,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${song.title} — ${song.artist.name}`,
      images: [ogImage],
    },
  };
}

export default async function SongPage({ params }: PageProps) {
  const { slug } = await params;

  const song = await prisma.song.findUnique({
    where: { slug },
    include: {
      artist: {
        select: {
          id: true,
          name: true,
          slug: true,
          bio: true,
          _count: { select: { followers: true } },
        },
      },
      queuePreferences: { select: { playCount: true, completeRate: true, skipRate: true, hypeCount: true, rotationScore: true } },
      milestones: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  if (!song) notFound();

  const [requestCount, favoriteCount, shareCount, similarSongs] = await Promise.all([
    prisma.songRequest.count({ where: { songId: song.id } }),
    prisma.songFavorite.count({ where: { songId: song.id } }),
    prisma.analyticsEvent.count({ where: { songId: song.id, eventName: "SHARE_TRACK_CLICK" } }),
    prisma.song.findMany({
      where: { vibe: song.vibe, id: { not: song.id } },
      select: {
        id: true, title: true, slug: true, coverUrl: true, isVault: true,
        artist: { select: { name: true, slug: true } },
        queuePreferences: { select: { playCount: true } },
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: 4,
    }),
  ]);

  let nextAirings: string[] = [];
  try {
    const snapshot = await readCatalogSnapshotFromStore();
    const catalog = snapshot.songs.map(normalizeStationSong);
    nextAirings = getUpcomingAirings(catalog, song.id, Date.now(), { limit: 2 }).map((airing) =>
      formatAiring(airing),
    );
  } catch {
    nextAirings = [];
  }

  const vibeKey = song.vibe.toUpperCase().replace(/ /g, "_");
  const siteUrl = getSiteUrl();
  const embedCode = `<iframe src="${siteUrl}/embed/${song.id}" width="100%" height="80" frameborder="0" allow="autoplay" style="border-radius:16px;overflow:hidden"></iframe>`;

  return (
    <AppShell eyebrow="Song" title={song.title}>
      {/* Nav breadcrumb */}
      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
        <Link href="/songs" className="text-slate-500 hover:text-slate-300 transition">Songs</Link>
        <span className="text-slate-700">/</span>
        <Link href={`/artists/${song.artist.slug}`} className="text-slate-500 hover:text-slate-300 transition">{song.artist.name}</Link>
        <span className="text-slate-700">/</span>
        <span className="text-slate-300">{song.title}</span>
      </div>

      {/* Hero */}
      <div className="mb-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        {/* Cover */}
        <div className="relative mx-auto h-52 w-52 shrink-0 overflow-hidden rounded-[1.8rem] bg-white/5 sm:mx-0 sm:h-56 sm:w-56">
          {song.coverUrl ? (
            <Image src={song.coverUrl} alt={song.title} fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-5xl">🎵</div>
          )}
          {song.isVault && (
            <div className="absolute right-3 top-3 rounded-full border border-fuchsia-400/35 bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-fuchsia-300 backdrop-blur-sm">
              Vault
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">{song.genre}</p>
            <h1 className="mt-1 text-3xl font-bold text-white leading-tight">{song.title}</h1>
            <Link href={`/artists/${song.artist.slug}`} className="mt-1 text-base text-slate-400 hover:text-white transition">
              {song.artist.name}
            </Link>
          </div>

          {/* Vibe chip */}
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${VIBE_COLOR[vibeKey] ?? VIBE_COLOR.UNSURE}`}>
              {song.vibe.replace(/_/g, " ").toLowerCase()}
            </span>
            {song.isAiGenerated && (
              <span className="rounded-full border border-violet-400/25 bg-violet-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">
                AI-generated
              </span>
            )}
            {song.isExplicit && (
              <span className="rounded-full border border-red-400/20 bg-red-400/[0.07] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-red-400">
                Explicit
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "plays", value: song.queuePreferences?.playCount ?? 0, color: "text-cyan-300" },
              { label: "requests", value: requestCount, color: "text-[#FF2DA6]" },
              { label: "saves", value: favoriteCount, color: "text-emerald-300" },
              { label: "shares", value: shareCount, color: "text-green-300" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex flex-col items-center rounded-[1rem] border border-white/8 bg-white/[0.03] px-3 py-2 min-w-14">
                <span className={`text-lg font-bold leading-none tabular-nums ${color}`}>{value.toLocaleString()}</span>
                <span className="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-slate-500">{label}</span>
              </div>
            ))}
          </div>

          {/* Action row */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/radio"
              className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_18px_rgba(0,229,255,0.3)] transition hover:shadow-[0_0_28px_rgba(0,229,255,0.5)]"
            >
              ▶ Listen on Radio
            </Link>
            <FavoriteButton songId={song.id} />
            <FollowButton artistId={song.artist.id} initialCount={song.artist._count.followers} />
          </div>
        </div>
      </div>

      {/* Behind the mix */}
      {song.behindTheMixText && (
        <section className="mb-6 rounded-[1.6rem] border border-violet-400/15 bg-violet-400/[0.04] p-5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-300">Behind the Mix</p>
          <p className="text-sm leading-6 text-slate-300">{song.behindTheMixText}</p>
        </section>
      )}

      <section className="mb-6 overflow-hidden rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80">
        <div className="border-b border-white/[0.05] px-6 py-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Station Status</h2>
          <p className="mt-1 text-xs text-slate-500">What this track looks like from the radio side.</p>
        </div>
        <div className="grid gap-4 px-6 py-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[1.3rem] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Rotation signal</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {nextAirings.length > 0 ? "Live in rotation" : "Catalog page live"}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {nextAirings.length > 0
                ? "This track is currently part of the deterministic station clock. Fans can catch it on-air and you can share the next window with confidence."
                : "This track is published on FlowSoundz. As rotation and broadcast timing expand, the next on-air window will appear here."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                {song.queuePreferences?.playCount?.toLocaleString() ?? "0"} plays
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                {requestCount.toLocaleString()} requests
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                rank {Math.round(song.queuePreferences?.rotationScore ?? 0)}
              </span>
            </div>
          </div>
          <div className="rounded-[1.3rem] border border-cyan-300/14 bg-cyan-300/[0.05] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80">Next on air</p>
            {nextAirings.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {nextAirings.map((airing) => (
                  <li key={airing} className="rounded-[1rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-100">
                    {airing}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-300">
                The next broadcast slot is not available yet. The live radio page still carries the current station state and upcoming blocks.
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/radio"
                className="inline-flex items-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-4 py-2 text-xs font-semibold text-white shadow-[0_0_18px_rgba(0,229,255,0.22)]"
              >
                Listen live →
              </Link>
              <Link
                href="/schedule"
                className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/80 transition hover:text-white"
              >
                View schedule
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Milestones */}
      {song.milestones.length > 0 && (
        <section className="mb-6 overflow-hidden rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80">
          <div className="border-b border-white/[0.05] px-6 py-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Milestones</h2>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {song.milestones.map((m) => {
              const pct = Math.min(Math.round((m.currentCount / m.goalTarget) * 100), 100);
              const done = m.currentCount >= m.goalTarget;
              return (
                <div key={m.id} className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:gap-6">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{m.rewardTitle}</p>
                    {m.rewardDescription && <p className="text-xs text-slate-500 mt-0.5">{m.rewardDescription}</p>}
                  </div>
                  <div className="flex flex-1 items-center gap-3">
                    <div className="relative flex-1 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full transition-all ${done ? "bg-emerald-400" : "bg-[linear-gradient(90deg,#7c4dff,#ff2da6)]"}`}
                        style={{ width: `${Math.max(pct, 3)}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-slate-400">
                      {m.currentCount.toLocaleString()} / {m.goalTarget.toLocaleString()}
                    </span>
                    {done && <span className="text-xs text-emerald-400 font-semibold">✓</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Embed code */}
      <section className="mb-6 overflow-hidden rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80">
        <div className="border-b border-white/[0.05] px-6 py-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Embed This Track</h2>
          <p className="mt-1 text-xs text-slate-500">Paste into any site to let fans play inline.</p>
        </div>
        <div className="px-6 py-4">
          <CopyEmbedCode code={embedCode} />
        </div>
      </section>

      {/* Similar tracks */}
      {similarSongs.length > 0 && (
        <section>
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            More {song.vibe.replace(/_/g, " ").toLowerCase()} vibes
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {similarSongs.map((s) => (
              <Link
                key={s.id}
                href={`/songs/${s.slug}`}
                className="flex items-center gap-3 rounded-[1.4rem] border border-white/8 bg-white/[0.02] p-3 transition hover:border-white/14 hover:bg-white/[0.04]"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/5">
                  {s.coverUrl ? (
                    <Image src={s.coverUrl} alt={s.title} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg">🎵</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{s.title}</p>
                  <p className="text-xs text-slate-400">{s.artist.name}</p>
                </div>
                {s.isVault && (
                  <span className="shrink-0 text-[10px] text-fuchsia-400">🔒</span>
                )}
                <span className="shrink-0 text-xs tabular-nums text-slate-600">
                  {(s.queuePreferences?.playCount ?? 0).toLocaleString()}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
