import { AppShell } from "@/components/AppShell";
import {
  readAnalyticsEvents,
  summarizeAnalyticsEvents,
  type AnalyticsEventRecord,
} from "@/lib/analyticsEventStore";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="glass-card rounded-[1.6rem] border border-white/10 p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

function RankedList({
  title,
  items,
}: {
  title: string;
  items: { label: string; count: number }[];
}) {
  return (
    <div className="glass-card rounded-[1.6rem] border border-white/10 p-5">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400">No events yet.</p>
        ) : (
          items.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-[1rem] border border-white/8 bg-white/[0.03] px-4 py-3"
            >
              <span className="text-sm text-slate-200">{item.label}</span>
              <span className="text-sm font-semibold text-cyan-200">
                {item.count}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default async function AdminInsightsPage() {
  let events: AnalyticsEventRecord[] = [];
  let storageError: string | null = null;

  try {
    events = await readAnalyticsEvents();
  } catch (error) {
    storageError =
      error instanceof Error
        ? error.message
        : "Failed to load analytics events.";
  }

  const summary = summarizeAnalyticsEvents(events);

  return (
    <AppShell
      eyebrow="Admin"
      title="Listener Insights"
      subtitle="Local-first analytics for radio playback, visualizer engagement, and Creator Hub conversion."
    >
      {storageError ? (
        <div className="glass-card mb-6 rounded-[1.6rem] border border-rose-400/20 p-5 text-sm leading-6 text-rose-100">
          {storageError}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Play Clicks" value={summary.totals.plays} />
        <StatCard label="Track Skips" value={summary.totals.skips} />
        <StatCard label="Track Completes" value={summary.totals.completes} />
        <StatCard
          label="Submit Conversion"
          value={`${summary.totals.submitConversion}%`}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Recent Replays" value={summary.totals.replayClicks} />
        <StatCard label="Artist Watches" value={summary.totals.watchAdds} />
        <StatCard label="Alerts Enabled" value={summary.totals.alertEnables} />
        <StatCard label="Alerts Disabled" value={summary.totals.alertDisables} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <RankedList title="Top Tracks" items={summary.topTracks} />
        <RankedList title="Top Vibes" items={summary.topVibes} />
        <RankedList title="Top Events" items={summary.topEvents} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <RankedList title="Retention Sources" items={summary.retentionSources} />
        <div className="glass-card rounded-[1.6rem] border border-white/10 p-5">
          <h2 className="text-lg font-semibold text-white">Retention Read</h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
            <p>
              Replays show whether radio discovery is converting into immediate control instead of a bounce.
            </p>
            <p>
              Artist watches show whether listeners want a return path for specific artists after the first impression.
            </p>
            <p>
              Alert enables show whether the station has enough pull for people to let FlowSoundz bring them back later.
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card mt-6 rounded-[1.6rem] border border-white/10 p-5">
        <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase tracking-[0.2em] text-slate-500">
              <tr>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Track</th>
                <th className="px-3 py-2">Vibe</th>
                <th className="px-3 py-2">URL</th>
                <th className="px-3 py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {summary.recent.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={5}>
                    No analytics events recorded yet.
                  </td>
                </tr>
              ) : (
                summary.recent.map((event, index) => (
                  <tr key={`${event.ts}-${event.event}-${index}`} className="border-t border-white/6">
                    <td className="px-3 py-3">{event.event}</td>
                    <td className="px-3 py-3">{event.title ?? "—"}</td>
                    <td className="px-3 py-3">{event.vibe ?? "—"}</td>
                    <td className="px-3 py-3">{event.url}</td>
                    <td className="px-3 py-3">{new Date(event.ts).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
