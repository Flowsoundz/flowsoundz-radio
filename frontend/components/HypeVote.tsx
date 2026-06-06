"use client";

import { useEffect, useRef, useState } from "react";

type Vote = "hype" | "skip" | null;

interface Props {
  songId: string | null;
}

export function HypeVote({ songId }: Props) {
  const [hypeCount, setHypeCount] = useState(0);
  const [myVote, setMyVote] = useState<Vote>(null);
  const [animating, setAnimating] = useState(false);
  const votedSongs = useRef<Set<string>>(new Set());

  // Reset when track changes
  useEffect(() => {
    if (!songId) return;
    setMyVote(votedSongs.current.has(songId) ? "hype" : null);

    fetch(`/api/radio/vote?songId=${encodeURIComponent(songId)}`)
      .then((r) => r.json())
      .then((d: { hypeCount?: number }) => setHypeCount(d.hypeCount ?? 0))
      .catch(() => setHypeCount(0));
  }, [songId]);

  async function castVote(vote: Vote) {
    if (!songId || myVote !== null) return;

    setMyVote(vote);
    if (vote === "hype") {
      votedSongs.current.add(songId);
      setHypeCount((c) => c + 1);
      setAnimating(true);
      setTimeout(() => setAnimating(false), 600);
    }

    try {
      await fetch("/api/radio/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId, vote }),
      });
    } catch {
      // optimistic — ignore failures
    }
  }

  if (!songId) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Hype button */}
      <button
        type="button"
        onClick={() => void castVote("hype")}
        disabled={myVote !== null}
        className={`group relative flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
          myVote === "hype"
            ? "border-orange-400/40 bg-orange-400/15 text-orange-300"
            : myVote === "skip"
            ? "border-white/5 bg-white/[0.02] text-slate-600 opacity-40"
            : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-orange-400/30 hover:bg-orange-400/10 hover:text-orange-300"
        }`}
      >
        <span className={`text-base leading-none transition-transform ${animating ? "scale-150" : "scale-100"}`}>
          🔥
        </span>
        <span>Fire</span>
        {hypeCount > 0 && (
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
            myVote === "hype" ? "bg-orange-400/20 text-orange-300" : "bg-white/5 text-slate-500"
          }`}>
            {hypeCount}
          </span>
        )}
      </button>

      {/* Skip vote button */}
      <button
        type="button"
        onClick={() => void castVote("skip")}
        disabled={myVote !== null}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
          myVote === "skip"
            ? "border-slate-400/30 bg-slate-400/10 text-slate-300"
            : myVote === "hype"
            ? "border-white/5 bg-white/[0.02] text-slate-600 opacity-40"
            : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-slate-400/20 hover:bg-slate-400/[0.07] hover:text-slate-200"
        }`}
      >
        <span className="text-base leading-none">👎</span>
        <span>Skip</span>
      </button>

      {myVote && (
        <span className="text-[10px] text-slate-600">
          {myVote === "hype" ? "voted!" : "noted"}
        </span>
      )}
    </div>
  );
}
