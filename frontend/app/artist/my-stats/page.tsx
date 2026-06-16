import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getStationBenchmarks, percentileRank, buildTips } from "@/lib/creatorBenchmark";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Stats — FlowSoundz Radio",
};

const VIBE_COLOR: Record<string, string> = {
  CHILL:      "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
  HYPE:       "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-200",
  LATE_NIGHT: "border-violet-400/25 bg-violet-400/10 text-violet-200",
  EMOTIONAL:  "border-amber-400/25 bg-amber-400/10 text-amber-200",
  UNSURE:     "border-slate-400/25 bg-slate-400/10 text-slate-300",
};

const VIBE_BAR: Record<string, string> = {
  CHILL:      "bg-cyan-400",
  HYPE:       "bg-fuchsia-400",
  LATE_NIGHT: "bg-violet-400",
  EMOTIONAL:  "bg-amber-400",
  UNSURE:     "bg-slate-400",
};

export default async function MyStatsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin?next=/artist/my-stats");

  const artist = await prisma.artist.findFirst({
    where: { email: session.user.email },
    include: {
      songs: {
        include: { queuePreferences: true },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!artist) {
    return (
      <AppShell eyebrow="Creator Hub" title="My Stats">
        <div className="mb-8">
          <Link href="/artist/dashboard" className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 transition hover:border-white/20 hover:text-white">
            ← Creator Hub
          </Link>
        </div>
        <div className="rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 p-12 text-center">
          <p className="mb-2 text-2xl">📊</p>
          <p className="mb-1 text-sm font-semibold text-white">No artist profile linked</p>
          <p className="mb-6 text-xs text-slate-500">Your account isn&apos;t connected to an artist profile yet. Submit your first track to get started.</p>
          <Link href="/artist/submit" className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_18px_rgba(0,229,255,0.3)] transition hover:shadow-[0_0_28px_rgba(0,229,255,0.5)]">
            Submit a Track
          </Link>
        </div>
      </AppShell>
    );
  }

  const songIds = artist.songs.map((s) => s.id);

  const [requestCounts, shareEvents, favoriteCounts] = await Promise.all([
    songIds.length > 0
      ? prisma.songRequest.groupBy({ by: ["songId"], where: { songId: { in: songIds } }, _count: { songId: true } })
      : Promise.resolve([] as { songId: string; _count: { songId: number } }[]),
    songIds.length > 0
      ? prisma.analyticsEvent.groupBy({ by: ["songId"], where: { eventName: "SHARE_TRACK_CLICK", songId: { in: songIds } }, _count: { songId: true } })
      : Promise.resolve([] as { songId: string | null; _count: { songId: number } }[]),
    songIds.length > 0
      ? prisma.songFavorite.groupBy({ by: ["songId"], where: { songId: { in: songIds } }, _count: { songId: true } })
      : Promise.resolve([] as { songId: string; _count: { songId: number } }[]),
  ]);

  const requestMap = new Map(requestCounts.map((r) => [r.songId, r._count.songId]));
  const shareMap = new Map(shareEvents.map((e) => [e.songId!, e._count.songId]));
  const favoriteMap = new Map(favoriteCounts.map((f) => [f.songId, f._count.songId]));

  const rows = artist.songs.map((s) => ({
    id: s.id,
    title: s.title,
    vibe: s.vibe as string,
    genre: s.genre,
    isFeatured: s.isFeatured,
    isVault: s.isVault,
    playCount: s.queuePreferences?.playCount ?? 0,
    skipRate: s.queuePreferences?.skipRate ?? 0,
    completeRate: s.queuePreferences?.completeRate ?? 0,
    hypeCount: s.queuePreferences?.hypeCount ?? 0,
    requests: requestMap.get(s.id) ?? 0,
    shares: shareMap.get(s.id) ?? 0,
    favorites: favoriteMap.get(s.id) ?? 0,
  }));

  rows.sort((a, b) => b.playCount - a.playCount);

  const totalPlays = rows.reduce((s, r) => s + r.playCount, 0);
  const totalRequests = rows.reduce((s, r) => s + r.requests, 0);
  const totalFavorites = rows.reduce((s, r) => s + r.favorites, 0);
  const totalShares = rows.reduce((s, r) => s + r.shares, 0);
  const playedRows = rows.filter((r) => r.playCount > 0);
  const avgComplete = playedRows.length > 0
    ? playedRows.reduce((s, r) => s + r.completeRate, 0) / playedRows.length
    : 0;
  const avgSkip = playedRows.length > 0
    ? playedRows.reduce((s, r) => s + r.skipRate, 0) / playedRows.length
    : 0;
  const maxPlays = rows[0]?.playCount ?? 1;

  // ── Benchmark this artist against the whole station ──
  const station = await getStationBenchmarks();
  const bestPlays = rows[0]?.playCount ?? 0;
  const bestPlayPercentile = station ? percentileRank(station.playCountsAsc, bestPlays) : 0;
  const tips = station
    ? buildTips({
        bestPlayPercentile,
        artistAvgComplete: avgComplete,
        artistAvgSkip: avgSkip,
        station,
        totalPlays,
        totalShares,
        artistSlug: artist.slug,
      })
    : [];
  // Directional comparison vs station average (only meaningful with plays).
  const completeDelta = station && playedRows.length ? avgComplete - station.avgCompleteRate : 0;
  const skipDelta = station && playedRows.length ? avgSkip - station.avgSkipRate : 0;

  return (
    <AppShell eyebrow="Creator Hub" title="My Stats">
      {/* Nav strip */}
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Link href="/artist/dashboard" className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 transition hover:border-white/20 hover:text-white">
          ← Creator Hub
        </Link>
        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
          {artist.name}
        </span>
        <Link href="/artist/drops" className="ml-auto rounded-full border border-fuchsia-400/20 bg-fuchsia-400/[0.05] px-3 py-1 text-xs text-fuchsia-300 transition hover:border-fuchsia-400/35 hover:text-fuchsia-200">
          Schedule Drops →
        </Link>
      </div>

      {/* Summary stats */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Total plays", value: totalPlays.toLocaleString(), accent: "text-cyan-300" },
          { label: "Requests", value: totalRequests.toLocaleString(), accent: "text-[#FF2DA6]" },
          { label: "Saves", value: totalFavorites.toLocaleString(), accent: "text-emerald-300" },
          { label: "Shares", value: totalShares.toLocaleString(), accent: "text-green-300" },
          { label: "Avg completion", value: `${Math.round(avgComplete * 100)}%`, accent: "text-violet-300" },
        ].map(({ label, value, accent }) => (
          <div key={label} className="flex flex-col gap-1 rounded-[1.6rem] border border-white/8 bg-[#0B1020]/80 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
            <p className={`text-3xl font-bold leading-none ${accent}`}>{value}</p>
          </div>
        ))}
      </section>

      {/* How you compare — benchmark vs the whole station */}
      {station && (
        <section className="mb-6 rounded-[1.8rem] border border-[#7c4dff]/20 bg-[linear-gradient(135deg,rgba(124,77,255,0.08),rgba(0,229,255,0.04))] p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/80">How you compare</h2>
            <span className="text-[11px] text-slate-500">vs {station.trackCount} track{station.trackCount !== 1 ? "s" : ""} on the station</span>
          </div>

          {playedRows.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-3xl font-bold leading-none text-violet-300">
                  Top {Math.max(1, 100 - bestPlayPercentile)}%
                </p>
                <p className="mt-1.5 text-[11px] leading-5 text-slate-400">
                  Your best track beats <span className="text-white">{bestPlayPercentile}%</span> of the catalog on plays
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold leading-none text-emerald-300">{Math.round(avgComplete * 100)}%</p>
                  <span className={`text-xs font-semibold ${completeDelta >= 0 ? "text-emerald-400" : "text-orange-300"}`}>
                    {completeDelta >= 0 ? "▲" : "▼"} {Math.abs(Math.round(completeDelta * 100))}pts
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] leading-5 text-slate-400">
                  Avg completion · station avg <span className="text-white">{Math.round(station.avgCompleteRate * 100)}%</span>
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold leading-none text-cyan-300">{Math.round(avgSkip * 100)}%</p>
                  <span className={`text-xs font-semibold ${skipDelta <= 0 ? "text-emerald-400" : "text-orange-300"}`}>
                    {skipDelta <= 0 ? "▼" : "▲"} {Math.abs(Math.round(skipDelta * 100))}pts
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] leading-5 text-slate-400">
                  Avg skip · station avg <span className="text-white">{Math.round(station.avgSkipRate * 100)}%</span> (lower is better)
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-400">
              Your tracks haven&apos;t logged plays yet — once they&apos;re in rotation, you&apos;ll see exactly how you stack up against the station here.
            </p>
          )}

          {tips.length > 0 && (
            <div className="mt-4 space-y-2">
              {tips.map((tip, i) => (
                <div
                  key={i}
                  className={`flex flex-col gap-2 rounded-[1.1rem] border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                    tip.tone === "good"
                      ? "border-emerald-400/20 bg-emerald-400/[0.06]"
                      : "border-white/8 bg-white/[0.03]"
                  }`}
                >
                  <p className="text-[12.5px] leading-6 text-slate-300">
                    <span className="mr-1.5">{tip.tone === "good" ? "✨" : "💡"}</span>
                    {tip.text}
                  </p>
                  {tip.href && tip.cta && (
                    <Link
                      href={tip.href}
                      className="shrink-0 self-start rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:border-white/25 sm:self-auto"
                    >
                      {tip.cta} →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Song table */}
      <section className="overflow-hidden rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80">
        <div className="border-b border-white/[0.05] px-6 py-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            {rows.length} track{rows.length !== 1 ? "s" : ""} · sorted by plays
          </h2>
        </div>

        {rows.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="mb-4 text-sm text-slate-500">Your tracks will appear here once they&apos;re in the catalog.</p>
            <Link href="/artist/submit" className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/5">
              Submit First Track
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {rows.map((row, i) => {
              const vibeKey = row.vibe.toUpperCase().replace(/ /g, "_");
              const skipPct = Math.round(row.skipRate * 100);
              const completePct = Math.round(row.completeRate * 100);
              const playBarPct = maxPlays > 0 ? Math.round((row.playCount / maxPlays) * 100) : 0;
              return (
                <div key={row.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex flex-1 min-w-0 items-center gap-3">
                    <span className="w-6 shrink-0 text-center text-xs tabular-nums text-slate-600">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {row.isFeatured && <span className="mr-1.5 text-[10px] text-amber-400">★</span>}
                        {row.isVault && <span className="mr-1.5 text-[10px] text-fuchsia-400">🔒</span>}
                        {row.title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-xs text-slate-500">{row.genre}</span>
                        <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] ${VIBE_COLOR[vibeKey] ?? VIBE_COLOR.UNSURE}`}>
                          {row.vibe.replace(/_/g, " ").toLowerCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className={`absolute inset-y-0 left-0 rounded-full ${VIBE_BAR[vibeKey] ?? "bg-slate-400"}`} style={{ width: `${playBarPct}%` }} />
                    </div>
                    <span className="w-8 text-right text-xs tabular-nums text-slate-300">{row.playCount}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#FF2DA6]/20 bg-[#FF2DA6]/[0.08] px-2.5 py-0.5 text-[10px] font-semibold tabular-nums text-[#FF2DA6]">🔥 {row.requests}</span>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-2.5 py-0.5 text-[10px] font-semibold tabular-nums text-emerald-300">♥ {row.favorites}</span>
                    <span className="rounded-full border border-green-400/20 bg-green-400/[0.08] px-2.5 py-0.5 text-[10px] font-semibold tabular-nums text-green-300">↗ {row.shares}</span>
                    {row.playCount > 0 && (
                      <>
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tabular-nums ${completePct >= 60 ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300" : completePct >= 35 ? "border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-300" : "border-slate-400/20 bg-slate-400/[0.08] text-slate-400"}`}>
                          ✓ {completePct}%
                        </span>
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tabular-nums ${skipPct >= 50 ? "border-red-400/20 bg-red-400/[0.08] text-red-300" : skipPct >= 25 ? "border-orange-400/20 bg-orange-400/[0.08] text-orange-300" : "border-slate-400/20 bg-slate-400/[0.08] text-slate-400"}`}>
                          ✕ {skipPct}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] text-slate-500">
        <span>🔥 requests · ♥ saves · ↗ shares · ✓ completion % · ✕ skip % · bar = plays vs your top track</span>
        <span>★ featured · 🔒 vault-only</span>
      </div>
    </AppShell>
  );
}
