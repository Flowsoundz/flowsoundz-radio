import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { readCatalogSnapshotFromStore } from "@/lib/catalogSnapshotStore";
import {
  readAnalyticsEvents,
  summarizeAnalyticsEvents,
} from "@/lib/analyticsEventStore";
import { readArtistSubmissions } from "@/lib/artistSubmissionStore";
import { STATIC_CATALOG } from "@/lib/staticCatalog";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Station Metrics — FlowSoundz Radio",
};

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  new: { label: "In Queue", cls: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200" },
  reviewing: { label: "Under Review", cls: "border-violet-400/20 bg-violet-400/10 text-violet-200" },
  approved: { label: "Approved", cls: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" },
  rejected: { label: "Not Selected", cls: "border-red-400/20 bg-red-400/10 text-red-300" },
};

const VIBE_ACCENT: Record<string, string> = {
  chill: "bg-cyan-400",
  hype: "bg-fuchsia-400",
  late_night: "bg-violet-400",
  emotional: "bg-amber-400",
  unsure: "bg-slate-400",
};

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="glass-card flex flex-col gap-1 rounded-[1.6rem] border border-white/8 bg-[#0B1020]/80 p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
      <p
        className={`font-headline text-3xl font-bold leading-none ${accent ?? "text-white"}`}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export default async function ArtistMetricsPage() {
  const session = await auth();
  if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) {
    redirect("/signin?next=/artist/metrics");
  }

  const [snapshot, submissions] = await Promise.all([
    readCatalogSnapshotFromStore(),
    readArtistSubmissions(),
  ]);

  let events: Awaited<ReturnType<typeof readAnalyticsEvents>> = [];
  try {
    events = await readAnalyticsEvents();
  } catch {
    // Analytics store not yet connected — show empty state
  }

  const stats = summarizeAnalyticsEvents(events);
  const analyticsConnected = events.length > 0;

  // Catalog vibe breakdown
  const vibeCounts = STATIC_CATALOG.reduce<Record<string, number>>((acc, t) => {
    const v = t.vibe ?? "unsure";
    acc[v] = (acc[v] ?? 0) + 1;
    return acc;
  }, {});
  const vibeTotal = STATIC_CATALOG.length;
  const vibeRows = Object.entries(vibeCounts).sort((a, b) => b[1] - a[1]);

  // Genre breakdown (top 6)
  const genreCounts = STATIC_CATALOG.reduce<Record<string, number>>((acc, t) => {
    if (t.genre) acc[t.genre] = (acc[t.genre] ?? 0) + 1;
    return acc;
  }, {});
  const genreRows = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const completionRate =
    stats.totals.completes + stats.totals.skips > 0
      ? Math.round(
          (stats.totals.completes / (stats.totals.completes + stats.totals.skips)) * 100,
        )
      : 0;

  const topTrackMax = stats.topTracks[0]?.count ?? 1;

  return (
    <AppShell eyebrow="Creator Hub" title="Station Metrics">

      {/* ── Nav strip ── */}
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Link
          href="/artist/dashboard"
          className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 transition hover:border-white/20 hover:text-white"
        >
          ← Creator Hub
        </Link>
        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
          Metrics
        </span>
        <Link
          href="/admin"
          className="ml-auto rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 transition hover:border-white/20 hover:text-white"
        >
          Admin →
        </Link>
      </div>

      {/* ── Station snapshot ── */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Station mode"
          value={
            snapshot.stationMode === "live"
              ? "Live"
              : snapshot.stationMode === "playable_archive"
                ? "Archive"
                : "Maintenance"
          }
          sub="current state"
          accent={snapshot.stationMode === "live" ? "text-emerald-300" : "text-cyan-200"}
        />
        <StatCard
          label="Tracks in rotation"
          value={STATIC_CATALOG.length}
          sub={`${snapshot.artists.length} artist${snapshot.artists.length === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Submissions"
          value={submissions.length}
          sub={`${submissions.filter((s) => s.status === "new").length} pending review`}
        />
        <StatCard
          label="Completion rate"
          value={analyticsConnected ? `${completionRate}%` : "—"}
          sub={analyticsConnected ? `${stats.totals.completes} full plays` : "no data yet"}
          accent="text-violet-300"
        />
      </section>

      {/* ── Analytics ── */}
      {analyticsConnected ? (
        <>
          {/* Play totals */}
          <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total events" value={stats.totals.events} accent="text-slate-200" />
            <StatCard label="Play sessions" value={stats.totals.plays} accent="text-cyan-300" />
            <StatCard label="Track skips" value={stats.totals.skips} accent="text-fuchsia-300" />
            <StatCard label="Full listens" value={stats.totals.completes} accent="text-emerald-300" />
          </section>

          {/* Top tracks */}
          {stats.topTracks.length > 0 && (
            <section className="glass-card mb-6 rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 p-6">
              <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Top tracks by listener activity
              </h2>
              <div className="flex flex-col gap-3">
                {stats.topTracks.map((track) => (
                  <div key={track.label} className="flex items-center gap-3">
                    <p className="w-40 shrink-0 truncate text-sm font-medium text-white sm:w-56">
                      {track.label}
                    </p>
                    <div className="relative flex-1 overflow-hidden rounded-full bg-white/[0.06] h-2">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#00e5ff,#7c4dff)]"
                        style={{ width: `${Math.round((track.count / topTrackMax) * 100)}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs tabular-nums text-slate-400">
                      {track.count}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Top vibes from analytics */}
          {stats.topVibes.length > 0 && (
            <section className="glass-card mb-6 rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 p-6">
              <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Vibe activity
              </h2>
              <div className="flex flex-col gap-3">
                {stats.topVibes.map((v) => {
                  const accent = VIBE_ACCENT[v.label.toLowerCase().replace(" ", "_")] ?? "bg-slate-400";
                  const pct = Math.round((v.count / (stats.topVibes[0]?.count ?? 1)) * 100);
                  return (
                    <div key={v.label} className="flex items-center gap-3">
                      <p className="w-28 shrink-0 capitalize text-sm font-medium text-white">
                        {v.label.replace("_", " ")}
                      </p>
                      <div className="relative flex-1 overflow-hidden rounded-full bg-white/[0.06] h-2">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full ${accent}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs tabular-nums text-slate-400">
                        {v.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="mb-6 rounded-[1.6rem] border border-white/8 bg-white/[0.03] px-6 py-5">
          <p className="text-sm font-semibold text-white">Analytics not yet connected</p>
          <p className="mt-1 text-sm text-slate-400">
            Play counts and track activity will appear here once{" "}
            <code className="rounded bg-white/5 px-1 py-0.5 text-xs text-cyan-300">DATABASE_URL</code>{" "}
            is set in your Vercel environment and listeners start playing tracks.
          </p>
        </div>
      )}

      {/* ── Catalog breakdown ── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {/* Vibe breakdown */}
        <section className="glass-card rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 p-6">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Catalog by vibe
          </h2>
          <div className="flex flex-col gap-3">
            {vibeRows.map(([vibe, count]) => {
              const accent = VIBE_ACCENT[vibe] ?? "bg-slate-400";
              const pct = Math.round((count / vibeTotal) * 100);
              return (
                <div key={vibe} className="flex items-center gap-3">
                  <p className="w-24 shrink-0 capitalize text-sm font-medium text-white">
                    {vibe.replace("_", " ")}
                  </p>
                  <div className="relative flex-1 overflow-hidden rounded-full bg-white/[0.06] h-2">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full ${accent}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs tabular-nums text-slate-400">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Genre breakdown */}
        <section className="glass-card rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 p-6">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Top genres
          </h2>
          <div className="flex flex-col gap-3">
            {genreRows.map(([genre, count]) => {
              const pct = Math.round((count / (genreRows[0]?.[1] ?? 1)) * 100);
              return (
                <div key={genre} className="flex items-center gap-3">
                  <p className="w-32 shrink-0 truncate text-sm font-medium text-white">
                    {genre}
                  </p>
                  <div className="relative flex-1 overflow-hidden rounded-full bg-white/[0.06] h-2">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#7c4dff,#ff2da6)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs tabular-nums text-slate-400">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* ── Submission pipeline ── */}
      <section className="glass-card rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Submission pipeline
          </h2>
          <Link
            href="/artist/submit"
            className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 transition hover:border-white/20 hover:text-white"
          >
            + New submission
          </Link>
        </div>

        {submissions.length === 0 ? (
          <p className="text-sm text-slate-500">
            No submissions yet.{" "}
            <Link href="/artist/submit" className="text-cyan-400 hover:text-cyan-300">
              Submit a track →
            </Link>
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-white/[0.05]">
            {submissions.map((sub) => {
              const s = STATUS_STYLES[sub.status] ?? STATUS_STYLES.new;
              return (
                <div key={sub.submission_id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {sub.song_title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {sub.artist_name} · {sub.genre} · {sub.vibe}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${s.cls}`}
                    >
                      {s.label}
                    </span>
                    <span className="text-xs tabular-nums text-slate-600">
                      {new Date(sub.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── CTA ── */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/artist/submit"
          className="inline-flex min-h-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-5 text-sm font-bold text-white shadow-[0_0_18px_rgba(0,229,255,0.28)] transition hover:shadow-[0_0_28px_rgba(0,229,255,0.45)]"
        >
          Submit a Track
        </Link>
        <Link
          href="/promo"
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/12 px-5 text-sm font-medium text-slate-300 transition hover:border-white/22 hover:text-white"
        >
          Promo Options
        </Link>
        <Link
          href="/radio"
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/12 px-5 text-sm font-medium text-slate-300 transition hover:border-white/22 hover:text-white"
        >
          Tune In
        </Link>
      </div>
    </AppShell>
  );
}
