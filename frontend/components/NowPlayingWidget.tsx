"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface NowPlayingData {
  title: string;
  artist: string;
  vibe: string;
  isPlaying: boolean;
  timestamp: number;
}

const STALE_MS = 30 * 60 * 1000;
const STORAGE_KEY = "flowsoundz-now-playing";
const CHANNEL_NAME = "flowsoundz-now-playing";

function EqBars({ active }: { active: boolean }) {
  return (
    <span className="flex items-end gap-[2px]" aria-hidden>
      {[4, 7, 5, 8, 3].map((h, i) => (
        <span
          key={i}
          className={`w-[2px] rounded-full bg-[#00E5FF] transition-all ${
            active ? "animate-eq-bar opacity-80" : "opacity-30"
          }`}
          style={{
            height: `${h}px`,
            animationDelay: active ? `${i * 80}ms` : undefined,
          }}
        />
      ))}
    </span>
  );
}

function isLive(data: NowPlayingData) {
  return data.isPlaying && Date.now() - data.timestamp < STALE_MS;
}

export default function NowPlayingWidget() {
  const [data, setData] = useState<NowPlayingData | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as NowPlayingData;
    } catch {}
    return null;
  });

  useEffect(() => {
    const ch = new BroadcastChannel(CHANNEL_NAME);
    ch.onmessage = (e: MessageEvent<NowPlayingData>) => setData(e.data);
    return () => ch.close();
  }, []);

  const live = data && isLive(data);

  return (
    <section className="py-5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-4 backdrop-blur-xl sm:px-6 sm:py-5">
          {/* ambient glow */}
          <div
            className="pointer-events-none absolute -inset-px rounded-2xl opacity-30"
            style={{
              background:
                "radial-gradient(ellipse 60% 80% at 10% 50%, rgba(0,229,255,0.08) 0%, transparent 70%), radial-gradient(ellipse 50% 80% at 90% 50%, rgba(139,92,246,0.08) 0%, transparent 70%)",
            }}
          />

          <div className="relative flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              {/* status dot + eq */}
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    live
                      ? "animate-pulse bg-[#00E5FF] shadow-[0_0_6px_rgba(0,229,255,0.7)]"
                      : "bg-white/20"
                  }`}
                />
                <EqBars active={!!live} />
              </div>

              {/* track info */}
              <div className="min-w-0">
                {live ? (
                  <>
                    <p className="truncate text-xs font-semibold text-[#F8FAFC] sm:text-sm">
                      {data!.title}
                    </p>
                    <p className="truncate text-[10px] text-white/50 sm:text-xs">
                      {data!.artist}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-white/60 sm:text-sm">
                      Station Ready
                    </p>
                    <p className="text-[10px] text-white/35 sm:text-xs">
                      Tune in to start the stream
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {live && (
                <span className="hidden rounded-full border border-[#00E5FF]/20 bg-[#00E5FF]/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-[#00E5FF] sm:inline-flex">
                  {data!.vibe}
                </span>
              )}
              <Link
                href="/radio"
                className="state-fade rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-medium text-[#CBD5E1] hover:bg-white/8 hover:text-[#F8FAFC] sm:px-4 sm:text-xs"
              >
                {live ? "Listen along →" : "Start Listening →"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
