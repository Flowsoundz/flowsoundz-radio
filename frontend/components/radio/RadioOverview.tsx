"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Show } from "@/lib/showSchedule";
import { useGlobalAudioRefs, useGlobalAudioState } from "@/components/GlobalAudioProvider";
import { RecentlyAiredRail } from "@/components/radio/RecentlyAiredRail";

type StationNowResponse =
  | {
      type: "track";
      song: {
        id: string;
        title: string;
        artist: string;
        vibe?: string;
        genre?: string;
        is_ai_generated?: boolean;
      };
      positionSec: number;
      remainingSec: number;
      next: {
        id: string;
        title: string;
        artist: string;
        vibe?: string;
      } | null;
      serverNowMs: number;
      vibe: string;
    }
  | {
      type: "break";
      next: {
        id: string;
        title: string;
        artist: string;
        vibe?: string;
      } | null;
      startsInSec: number;
      serverNowMs: number;
      vibe: string;
    };

type ScheduleResponse = {
  current: Show | null;
  upcoming: Array<Show & { startsInMinutes: number }>;
};

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function formatStartsIn(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function RadioOverview() {
  const { togglePlaybackRef, skipTrackRef } = useGlobalAudioRefs();
  const { currentTrack, hasStartedPlayback, isPlaying } = useGlobalAudioState();
  const [station, setStation] = useState<StationNowResponse | null>(null);
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const [stationRes, scheduleRes] = await Promise.all([
          fetch("/api/radio/station-now", { cache: "no-store" }),
          fetch("/api/schedule", { cache: "no-store" }),
        ]);

        if (!cancelled && stationRes.ok) {
          setStation((await stationRes.json()) as StationNowResponse);
        }

        if (!cancelled && scheduleRes.ok) {
          setSchedule((await scheduleRes.json()) as ScheduleResponse);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void hydrate();
    const interval = window.setInterval(() => void hydrate(), 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const headline = useMemo(() => {
    if (!station) {
      return "Synchronized after-hours radio for discovery-first listeners.";
    }

    if (station.type === "track") {
      return `On air now: ${station.song.title} by ${station.song.artist}.`;
    }

    if (station.next) {
      return `Station break right now. ${station.next.title} by ${station.next.artist} is next up.`;
    }

    return "Station break right now while the next block lines up.";
  }, [station]);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-[linear-gradient(135deg,#0b1225_0%,#07111f_52%,#050816_100%)] px-6 py-8 sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[8%] top-[14%] h-56 w-56 rounded-full bg-[#00e5ff]/10 blur-[90px]" />
          <div className="absolute bottom-0 right-[10%] h-56 w-56 rounded-full bg-[#7c4dff]/14 blur-[100px]" />
          <div className="absolute right-[28%] top-[10%] h-40 w-40 rounded-full bg-[#ff2da6]/10 blur-[72px]" />
        </div>

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.25fr_0.95fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="live-badge inline-flex items-center gap-2 rounded-full border border-[#ff2da6]/20 bg-[#ff2da6]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#ff9bd4]">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-[#ff2da6]" />
                On Air
              </span>
              <span className="rounded-full border border-cyan-300/18 bg-cyan-300/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/75">
                Real-time station clock
              </span>
            </div>

            <h2 className="mt-4 font-headline text-[clamp(2.4rem,7vw,5.3rem)] uppercase leading-[0.92] tracking-tight text-white">
              Radio
              <br />
              <span className="text-[#00e5ff]">That Feels</span>{" "}
              <span className="text-[#7c4dff]">Programmed.</span>
            </h2>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              {headline} FlowSoundz works best when listeners tune in together, react in the same
              moment, and discover artists before the rest of the feed catches up.
            </p>
            <div className="mt-5 rounded-[1.35rem] border border-cyan-300/14 bg-cyan-300/[0.06] px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
                Start here
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-100">
                Hit <span className="font-semibold text-white">Start Station</span>, watch the
                current block, then open artists or the schedule once you are in the mood of the room.
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                {
                  label: "Broadcast feel",
                  value: "Shared timing, not private playlist drift.",
                },
                {
                  label: "Artist outcome",
                  value: station?.type === "track" ? `${station.song.artist} is on-air in the current block.` : "Every approved record gets a real station moment.",
                },
                {
                  label: "Listener ritual",
                  value: schedule?.current ? `${schedule.current.name} is shaping the tone right now.` : "The live mix and show grid stay in sync.",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] px-4 py-4"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => togglePlaybackRef.current?.()}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_22px_rgba(0,229,255,0.26)] transition hover:shadow-[0_0_34px_rgba(0,229,255,0.44)]"
              >
                {hasStartedPlayback ? (isPlaying ? "Pause Station" : "Resume Station") : "Start Station"}
              </button>
              <button
                type="button"
                onClick={() => void skipTrackRef.current?.()}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/5"
              >
                Skip Ahead
              </button>
              <Link
                href="/artists"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-cyan-300/18 bg-cyan-300/[0.06] px-6 py-2.5 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/32 hover:bg-cyan-300/[0.1]"
              >
                Meet the artists
              </Link>
              <Link
                href="/membership"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/5"
              >
                Unlock Insider
              </Link>
            </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Shared timing", value: "Everyone hears the same block." },
                  { label: "Human curation", value: "Discovery-first, not playlist filler." },
                  {
                    label: "AI host layer",
                    value: currentTrack ? `Mounted player ready: ${currentTrack.title} by ${currentTrack.artist}.` : "DJ chat, drops, and transition support.",
                  },
                ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] px-4 py-4"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="now-playing-card rounded-[1.8rem] border border-white/8 bg-white/[0.035] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
                Station Snapshot
              </p>

              {loading ? (
                <div className="mt-5 flex items-center gap-3 text-sm text-slate-400">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-cyan-300" />
                  Syncing station clock…
                </div>
              ) : station?.type === "track" ? (
                <div className="mt-5 space-y-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">
                      Playing now
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">{station.song.title}</h3>
                    <p className="mt-1 text-sm text-slate-300">{station.song.artist}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {station.song.vibe ? (
                      <span className="rounded-full border border-cyan-300/18 bg-cyan-300/[0.08] px-3 py-1 text-[11px] font-semibold text-cyan-200">
                        {station.song.vibe}
                      </span>
                    ) : null}
                    {station.song.genre ? (
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-white/70">
                        {station.song.genre}
                      </span>
                    ) : null}
                    {station.song.is_ai_generated ? (
                      <span className="rounded-full border border-fuchsia-400/18 bg-fuchsia-400/[0.08] px-3 py-1 text-[11px] font-semibold text-fuchsia-200">
                        AI-assisted release
                      </span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[1.2rem] border border-white/8 bg-black/20 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
                        In track
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {formatDuration(station.positionSec)}
                      </p>
                    </div>
                    <div className="rounded-[1.2rem] border border-white/8 bg-black/20 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
                        Remaining
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {formatDuration(station.remainingSec)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.02] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
                      Next up
                    </p>
                    <p className="mt-2 text-sm text-slate-200">
                      {station.next ? `${station.next.title} by ${station.next.artist}` : "Block end ident / transition"}
                    </p>
                  </div>
                </div>
              ) : station?.type === "break" ? (
                <div className="mt-5 space-y-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">
                      Station break
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">Transition window</h3>
                    <p className="mt-1 text-sm text-slate-300">
                      Drops, beds, and station voice content hold the sync between songs.
                    </p>
                  </div>
                  <div className="rounded-[1.2rem] border border-white/8 bg-black/20 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
                      Starts in
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {formatDuration(station.startsInSec)}
                    </p>
                  </div>
                  <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.02] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
                      Next record
                    </p>
                    <p className="mt-2 text-sm text-slate-200">
                      {station.next ? `${station.next.title} by ${station.next.artist}` : "New block starting soon"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-5 text-sm text-slate-400">
                  Station data is loading.
                </div>
              )}
            </div>

            <div className="rounded-[1.8rem] border border-white/8 bg-white/[0.03] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-fuchsia-200/75">
                What to do here
              </p>
              <div className="mt-4 grid gap-3">
                {[
                  "Ask the AI DJ what is playing if you want context without breaking the station mood.",
                  "Vote, tip, and react while the same track is on air for everyone else.",
                  "Open artist profiles from the player when a record catches you in the moment.",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.1rem] border border-white/8 bg-black/20 px-4 py-3 text-sm leading-6 text-slate-200"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[1.8rem] border border-white/8 bg-white/[0.03] p-5 sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
            Why It Feels Different
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              {
                title: "Station logic",
                body: "The schedule is deterministic and shared, so the radio behaves like a real broadcast instead of a private playlist.",
              },
              {
                title: "Curated context",
                body: "The player, AI DJ, drops, and artist panel all support the same discovery moment instead of competing for attention.",
              },
              {
                title: "Listener rituals",
                body: "Members can return for scheduled drops, early access windows, and show-based programming instead of random passive playback.",
              },
              {
                title: "Artist upside",
                body: "Every airing can become a story moment, shareable event, and conversion point for the artist behind the record.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[1.3rem] border border-white/8 bg-black/20 px-4 py-4"
              >
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-white/8 bg-white/[0.03] p-5 sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-fuchsia-200/75">
            Show Calendar
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Use the schedule when you want to come back for a specific vibe instead of leaving the station on shuffle logic.
          </p>
          <div className="mt-5 space-y-3">
            {schedule?.current ? (
              <div
                className="rounded-[1.3rem] border px-4 py-4"
                style={{
                  borderColor: `${schedule.current.accentColor}30`,
                  background: `${schedule.current.accentColor}10`,
                }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                  On now
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {schedule.current.emoji} {schedule.current.name}
                </p>
                <p className="mt-1 text-sm text-slate-200">{schedule.current.tagline}</p>
              </div>
            ) : (
              <div className="rounded-[1.3rem] border border-white/8 bg-black/20 px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                  Off-schedule
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-200">
                  The continuous rotation is carrying the station right now.
                </p>
              </div>
            )}

            {(schedule?.upcoming ?? []).slice(0, 4).map((show) => (
              <div
                key={show.id}
                className="rounded-[1.25rem] border border-white/8 bg-black/20 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {show.emoji} {show.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{show.tagline}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-white/70">
                    {formatStartsIn(show.startsInMinutes)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <RecentlyAiredRail />
    </div>
  );
}
