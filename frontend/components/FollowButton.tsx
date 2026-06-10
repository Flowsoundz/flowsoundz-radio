"use client";

import { useEffect, useState } from "react";

type Props = {
  artistId: string;
  initialCount?: number;
};

export function FollowButton({ artistId, initialCount = 0 }: Props) {
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch(`/api/artist/follow?artistId=${artistId}`)
      .then((r) => r.json())
      .then((d: { following?: boolean; count?: number }) => {
        setFollowing(d.following ?? false);
        setCount(d.count ?? initialCount);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [artistId, initialCount]);

  async function toggle() {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch("/api/artist/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId }),
      });
      const d = (await res.json()) as { following?: boolean; count?: number };
      setFollowing(d.following ?? !following);
      setCount(d.count ?? count);
    } catch {
      // ignore
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <div className="h-9 w-28 animate-pulse rounded-full bg-white/[0.06]" />
    );
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={pending}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition disabled:opacity-60 ${
        following
          ? "border-fuchsia-400/35 bg-fuchsia-400/10 text-fuchsia-200 hover:border-red-400/30 hover:bg-red-400/[0.07] hover:text-red-300"
          : "border-white/15 bg-white/[0.04] text-slate-300 hover:border-fuchsia-400/35 hover:bg-fuchsia-400/10 hover:text-fuchsia-200"
      }`}
    >
      <span>{following ? "Following" : "Follow"}</span>
      {count > 0 && (
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${following ? "bg-fuchsia-400/20 text-fuchsia-300" : "bg-white/8 text-slate-400"}`}>
          {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
        </span>
      )}
    </button>
  );
}
