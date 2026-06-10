"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Song } from "@/lib/types";

// Lightweight live-rotation player for third-party iframes (e.g. GymTwin).
// Sequential queue playback only — no chat, votes, drops, or visualizer.

type Phase = "idle" | "loading" | "playing" | "paused" | "error";

export function EmbedRadioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<Song[]>([]);
  const indexRef = useRef(0);
  const failedRef = useRef(0);

  const [phase, setPhase] = useState<Phase>("idle");
  const [current, setCurrent] = useState<Song | null>(null);

  // Stream auth cookie for /audio/* tracks; refresh inside the 50-min window
  useEffect(() => {
    const grab = () => { void fetch("/api/stream/auth").catch(() => undefined); };
    grab();
    const id = window.setInterval(grab, 45 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  const playIndex = useCallback((index: number) => {
    const audio = audioRef.current;
    const queue = queueRef.current;
    if (!audio || queue.length === 0) return;

    // Every track failed once — stop instead of looping error skips forever
    if (failedRef.current >= queue.length) {
      setPhase("error");
      return;
    }

    const song = queue[index % queue.length]!;
    indexRef.current = index % queue.length;
    setCurrent(song);

    const src = song.public_audio_url;
    if (!src) {
      failedRef.current += 1;
      playIndex(index + 1);
      return;
    }

    audio.src = src;
    audio.onended = () => playIndex(indexRef.current + 1);
    audio.onerror = () => {
      failedRef.current += 1;
      playIndex(indexRef.current + 1);
    };

    void audio.play().then(() => {
      failedRef.current = 0;
      setPhase("playing");
    }).catch(() => {
      failedRef.current += 1;
      playIndex(indexRef.current + 1);
    });
  }, []);

  const startStation = useCallback(async () => {
    setPhase("loading");
    try {
      const res = await fetch("/api/queue");
      if (!res.ok) throw new Error("queue unavailable");
      const songs = (await res.json()) as Song[];
      const playable = songs.filter((s) => s.is_playable && s.public_audio_url);
      if (playable.length === 0) throw new Error("no playable tracks");
      queueRef.current = playable;
      failedRef.current = 0;
      playIndex(0);
    } catch {
      setPhase("error");
    }
  }, [playIndex]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (phase === "playing") {
      audio.pause();
      setPhase("paused");
    } else if (phase === "paused") {
      void audio.play().then(() => setPhase("playing")).catch(() => undefined);
    }
  }

  const coverSrc = current?.cover_url ?? null;

  return (
    <div className="flex h-screen w-full flex-col justify-between bg-[linear-gradient(180deg,#0B1020_0%,#050816_100%)] p-4 font-sans text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2">
            <span className={`h-2 w-2 rounded-full ${phase === "playing" ? "animate-pulse bg-[#FF2DA6]" : "bg-slate-600"}`} />
          </span>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#00E5FF]">
            FlowSoundz Radio
          </p>
        </div>
        <a
          href="https://flowsoundzradio.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-semibold text-slate-500 transition hover:text-white"
        >
          flowsoundzradio.com ↗
        </a>
      </div>

      {/* Body */}
      {phase === "idle" || phase === "loading" ? (
        <button
          type="button"
          onClick={() => void startStation()}
          disabled={phase === "loading"}
          className="mx-auto flex items-center gap-3 rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-8 py-4 text-base font-semibold text-white shadow-[0_0_30px_rgba(0,229,255,0.35)] transition hover:scale-[1.03] active:scale-[0.97] disabled:opacity-60"
        >
          {phase === "loading" ? "Tuning in…" : "▶ Listen Live"}
        </button>
      ) : phase === "error" ? (
        <div className="text-center">
          <p className="text-sm text-slate-300">The live rotation isn&apos;t available here right now.</p>
          <a
            href="https://flowsoundzradio.com/radio"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block rounded-full border border-[#00E5FF]/30 bg-[#00E5FF]/10 px-4 py-1.5 text-xs font-semibold text-[#00E5FF] transition hover:bg-[#00E5FF]/20"
          >
            Listen on flowsoundzradio.com →
          </a>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {coverSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverSrc}
              alt=""
              className="h-14 w-14 shrink-0 rounded-xl border border-white/10 object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#00E5FF]/20 bg-[#00E5FF]/8 text-xl">
              🎧
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{current?.title ?? "—"}</p>
            <p className="truncate text-xs text-slate-400">{current?.artist ?? ""}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] text-sm font-bold text-white shadow-[0_0_18px_rgba(0,229,255,0.4)] transition active:scale-95"
              aria-label={phase === "playing" ? "Pause" : "Play"}
            >
              {phase === "playing" ? "▐▐" : "▶"}
            </button>
            <button
              type="button"
              onClick={() => playIndex(indexRef.current + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/5 text-xs text-slate-300 transition hover:border-[#00E5FF]/30 hover:text-white active:scale-95"
              aria-label="Next track"
            >
              ⏭
            </button>
          </div>
        </div>
      )}

      {/* Footer strip */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/8">
        <div
          className={`h-full rounded-full bg-[linear-gradient(90deg,#00e5ff,#7c4dff,#FF2DA6)] transition-all ${phase === "playing" ? "w-full animate-pulse" : "w-0"}`}
        />
      </div>
    </div>
  );
}
