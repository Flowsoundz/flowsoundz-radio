import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { SHOWS, getCurrentShow, getUpcomingShows } from "@/lib/showSchedule";

export const metadata: Metadata = {
  title: "Schedule — FlowSoundz Radio",
  description: "Weekly programming schedule for FlowSoundz Radio. Curated shows every night.",
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatShowTime(startHour: number, durationMinutes: number): string {
  const endMinute = startHour * 60 + durationMinutes;
  const endHour = Math.floor(endMinute / 60) % 24;
  const endMin = endMinute % 60;
  const fmt = (h: number, m: number) => {
    const suffix = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return m > 0 ? `${hour}:${String(m).padStart(2, "0")} ${suffix}` : `${hour} ${suffix}`;
  };
  return `${fmt(startHour, 0)} – ${fmt(endHour, endMin)} ET`;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function SchedulePage() {
  const current = getCurrentShow();
  const upcoming = getUpcomingShows(3);
  const sortedShows = [...SHOWS].sort((a, b) =>
    a.dayOfWeek !== b.dayOfWeek ? a.dayOfWeek - b.dayOfWeek : a.startHour - b.startHour,
  );

  return (
    <AppShell eyebrow="Programming" title="On Air Schedule">
      {/* Live now */}
      {current && (
        <div
          className="mb-10 rounded-[1.8rem] border p-6"
          style={{ borderColor: `${current.accentColor}30`, background: `${current.accentColor}0a` }}
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full" style={{ background: current.accentColor }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: current.accentColor }}>
              On Air Now
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white">{current.emoji} {current.name}</h2>
          <p className="mt-1 text-sm text-slate-400">{current.tagline}</p>
          <p className="mt-1 text-xs text-slate-500">{formatShowTime(current.startHour, current.durationMinutes)}</p>
          <Link
            href="/radio"
            className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:opacity-90"
            style={{ background: current.accentColor }}
          >
            Listen Now →
          </Link>
        </div>
      )}

      {/* Up Next */}
      {upcoming.length > 0 && (
        <div className="mb-10">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Up Next</h3>
          <div className="flex flex-col gap-3">
            {upcoming.map((show) => (
              <div
                key={`${show.id}-upcoming`}
                className="flex items-center justify-between rounded-2xl border border-white/6 bg-white/[0.03] px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{show.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{show.name}</p>
                    <p className="text-xs text-slate-500">
                      in {formatMinutes(show.startsInMinutes)}
                    </p>
                  </div>
                </div>
                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: show.accentColor, background: `${show.accentColor}15` }}
                >
                  {show.vibe === "all" ? "All Vibes" : show.vibe.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full weekly grid */}
      <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Weekly Schedule</h3>
      <div className="flex flex-col gap-4">
        {sortedShows.map((show) => {
          const isNow = current?.id === show.id;
          return (
            <div
              key={show.id}
              className="flex items-start gap-4 rounded-[1.4rem] border border-white/6 bg-white/[0.025] px-5 py-4 transition"
              style={isNow ? { borderColor: `${show.accentColor}35`, background: `${show.accentColor}08` } : {}}
            >
              <div className="shrink-0 text-center" style={{ minWidth: 52 }}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {DAYS[show.dayOfWeek].slice(0, 3)}
                </p>
                <p className="mt-0.5 text-lg font-bold" style={{ color: show.accentColor }}>
                  {show.emoji}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold text-white">{show.name}</span>
                  {isNow && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest"
                      style={{ color: show.accentColor, background: `${show.accentColor}20` }}
                    >
                      Live
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-400">{show.tagline}</p>
                <p className="mt-1 text-[11px] text-slate-600">
                  {formatShowTime(show.startHour, show.durationMinutes)} · {formatMinutes(show.durationMinutes)}
                </p>
              </div>
              <span
                className="shrink-0 self-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: show.accentColor, background: `${show.accentColor}12` }}
              >
                {show.vibe === "all" ? "All" : show.vibe.replace("_", " ")}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-10 text-center text-xs text-slate-600">All times Eastern (ET) · Schedule subject to change</p>
    </AppShell>
  );
}
