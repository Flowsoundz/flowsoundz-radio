import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Track Analytics — FlowSoundz Radio",
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

function Bar({ pct, vibe }: { pct: number; vibe: string }) {
  return (
    <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className={`absolute inset-y-0 left-0 rounded-full ${VIBE_BAR[vibe] ?? "bg-slate-400"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) {
    redirect("/signin?next=/artist/analytics");
  }

  // Fetch songs with queue preferences, request counts, share events, and milestones in parallel
  const [songs, requestCounts, shareEvents] = await Promise.all([
    prisma.song.findMany({
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      include: {
        artist: { select: { name: true, slug: true } },
        queuePreferences: true,
        milestones: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.songRequest.groupBy({
      by: ["songId"],
      _count: { songId: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["songId"],
      where: { eventName: "SHARE_TRACK_CLICK", songId: { not: null } },
      _count: { songId: true },
    }),
  ]);

  const requestMap = new Map(requestCounts.map((r) => [r.songId, r._count.songId]));
  const shareMap = new Map(shareEvents.map((e) => [e.songId!, e._count.songId]));

  type Row = {
    id: string;
    title: string;
    artist: string;
    artistSlug: string;
    vibe: string;
    genre: string;
    playCount: number;
    skipRate: number;
    completeRate: number;
    hypeCount: number;
    rotationScore: number;
    requests: number;
    shares: number;
    isFeatured: boolean;
  };

  const rows: Row[] = songs.map((s) => ({
    id: s.id,
    title: s.title,
    artist: s.artist.name,
    artistSlug: s.artist.slug,
    vibe: s.vibe,
    genre: s.genre,
    playCount: s.queuePreferences?.playCount ?? 0,
    skipRate: s.queuePreferences?.skipRate ?? 0,
    completeRate: s.queuePreferences?.completeRate ?? 0,
    hypeCount: s.queuePreferences?.hypeCount ?? 0,
    rotationScore: s.queuePreferences?.rotationScore ?? 0,
    requests: requestMap.get(s.id) ?? 0,
    shares: shareMap.get(s.id) ?? 0,
    isFeatured: s.isFeatured,
  }));

  // Sort by playCount desc by default
  rows.sort((a, b) => b.playCount - a.playCount || b.requests - a.requests);

  // Station totals
  const totalPlays = rows.reduce((s, r) => s + r.playCount, 0);
  const totalRequests = rows.reduce((s, r) => s + r.requests, 0);
  const totalShares = rows.reduce((s, r) => s + r.shares, 0);
  const totalHype = rows.reduce((s, r) => s + r.hypeCount, 0);
  const avgCompleteRate = rows.filter((r) => r.playCount > 0).length > 0
    ? rows.filter((r) => r.playCount > 0).reduce((s, r) => s + r.completeRate, 0) /
      rows.filter((r) => r.playCount > 0).length
    : 0;

  const maxPlays = rows[0]?.playCount ?? 1;

  return (
    <AppShell eyebrow="Creator Hub" title="Track Analytics">
      {/* Nav strip */}
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Link
          href="/artist/dashboard"
          className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 transition hover:border-white/20 hover:text-white"
        >
          ← Creator Hub
        </Link>
        <span className="rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300">
          Analytics
        </span>
        <Link
          href="/artist/metrics"
          className="ml-auto rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 transition hover:border-white/20 hover:text-white"
        >
          Station Metrics →
        </Link>
      </div>

      {/* Station totals */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Total plays", value: totalPlays.toLocaleString(), accent: "text-cyan-300" },
          { label: "Requests", value: totalRequests.toLocaleString(), accent: "text-[#FF2DA6]" },
          { label: "Shares", value: totalShares.toLocaleString(), accent: "text-green-300" },
          { label: "Hype votes", value: totalHype.toLocaleString(), accent: "text-amber-300" },
          {
            label: "Avg completion",
            value: `${Math.round(avgCompleteRate * 100)}%`,
            accent: "text-violet-300",
          },
        ].map(({ label, value, accent }) => (
          <div
            key={label}
            className="flex flex-col gap-1 rounded-[1.6rem] border border-white/8 bg-[#0B1020]/80 p-5"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              {label}
            </p>
            <p className={`font-headline text-3xl font-bold leading-none ${accent}`}>{value}</p>
          </div>
        ))}
      </section>

      {/* Per-track table */}
      <section className="rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-white/[0.05]">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            {rows.length} tracks · sorted by plays
          </h2>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {rows.map((row, i) => {
            const vibeKey = row.vibe.toUpperCase().replace(" ", "_");
            const skipPct = Math.round(row.skipRate * 100);
            const completePct = Math.round(row.completeRate * 100);
            const playBarPct = maxPlays > 0 ? Math.round((row.playCount / maxPlays) * 100) : 0;

            return (
              <div
                key={row.id}
                className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:gap-4"
              >
                {/* Rank + info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="w-6 shrink-0 text-center text-xs tabular-nums text-slate-600">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {row.isFeatured && (
                        <span className="mr-1.5 text-[10px] text-amber-400">★</span>
                      )}
                      {row.title}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <Link
                        href={`/artists/${row.artistSlug}`}
                        className="text-xs text-slate-400 hover:text-slate-200 transition"
                      >
                        {row.artist}
                      </Link>
                      <span
                        className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] ${
                          VIBE_COLOR[vibeKey] ?? VIBE_COLOR.UNSURE
                        }`}
                      >
                        {row.vibe.replace("_", " ").toLowerCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Play bar */}
                <div className="flex items-center gap-2">
                  <Bar pct={playBarPct} vibe={vibeKey} />
                  <span className="w-8 text-right text-xs tabular-nums text-slate-300">
                    {row.playCount}
                  </span>
                </div>

                {/* Stats chips */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#FF2DA6]/20 bg-[#FF2DA6]/8 px-2.5 py-0.5 text-[10px] font-semibold tabular-nums text-[#FF2DA6]">
                    🔥 {row.requests}
                  </span>
                  <span className="rounded-full border border-green-400/20 bg-green-400/8 px-2.5 py-0.5 text-[10px] font-semibold tabular-nums text-green-300">
                    ↗ {row.shares}
                  </span>
                  <span className="rounded-full border border-amber-400/20 bg-amber-400/8 px-2.5 py-0.5 text-[10px] font-semibold tabular-nums text-amber-300">
                    ⚡ {row.hypeCount}
                  </span>
                  {row.playCount > 0 && (
                    <>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                          completePct >= 60
                            ? "border-emerald-400/20 bg-emerald-400/8 text-emerald-300"
                            : completePct >= 35
                              ? "border-cyan-400/20 bg-cyan-400/8 text-cyan-300"
                              : "border-slate-400/20 bg-slate-400/8 text-slate-400"
                        }`}
                      >
                        ✓ {completePct}%
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                          skipPct >= 50
                            ? "border-red-400/20 bg-red-400/8 text-red-300"
                            : skipPct >= 25
                              ? "border-orange-400/20 bg-orange-400/8 text-orange-300"
                              : "border-slate-400/20 bg-slate-400/8 text-slate-400"
                        }`}
                      >
                        ✕ {skipPct}%
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {rows.length === 0 && (
            <p className="px-6 py-10 text-sm text-slate-500">
              No tracks in the catalog yet.
            </p>
          )}
        </div>
      </section>

      {/* Milestone tracker */}
      {(() => {
        const withMilestones = songs.filter((s) => s.milestones.length > 0);
        if (withMilestones.length === 0) return null;
        return (
          <section className="mt-6 rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.05]">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Milestone Tracker</h2>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {withMilestones.map((song) =>
                song.milestones.map((m) => {
                  const pct = Math.min(Math.round((m.currentCount / m.goalTarget) * 100), 100);
                  const done = m.currentCount >= m.goalTarget;
                  return (
                    <div key={m.id} className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:gap-6">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{song.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{m.rewardTitle}</p>
                      </div>
                      <div className="flex-1 flex items-center gap-3">
                        <div className="relative flex-1 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full transition-all ${done ? "bg-emerald-400" : "bg-[linear-gradient(90deg,#7c4dff,#ff2da6)]"}`}
                            style={{ width: `${Math.max(pct, 3)}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-xs tabular-nums text-slate-400">
                          {m.currentCount.toLocaleString()} / {m.goalTarget.toLocaleString()}
                        </span>
                        {done && <span className="text-xs text-emerald-400 font-semibold">✓ Unlocked</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        );
      })()}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] text-slate-500">
        <span>🔥 requests · ↗ shares · ⚡ hype votes</span>
        <span>✓ completion % · ✕ skip % · bar = plays relative to top track</span>
        <span>★ = featured track</span>
      </div>
    </AppShell>
  );
}
