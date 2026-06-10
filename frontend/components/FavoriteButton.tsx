"use client";

import { useEffect, useState } from "react";

type Props = { songId: string };

export default function FavoriteButton({ songId }: Props) {
  const [favorited, setFavorited] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch(`/api/radio/favorite?songId=${songId}`)
      .then((r) => r.json())
      .then((d: { favorited?: boolean; count?: number }) => {
        setFavorited(d.favorited ?? false);
        setCount(d.count ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [songId]);

  async function toggle() {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch("/api/radio/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId }),
      });
      const d = (await res.json()) as { favorited?: boolean; count?: number };
      setFavorited(d.favorited ?? !favorited);
      setCount(d.count ?? count);
    } catch {
      // ignore
    } finally {
      setPending(false);
    }
  }

  if (loading) return <div className="h-9 w-20 animate-pulse rounded-full bg-white/[0.06]" />;

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={pending}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition disabled:opacity-60 ${
        favorited
          ? "border-[#FF2DA6]/35 bg-[#FF2DA6]/10 text-[#FF2DA6]"
          : "border-white/15 bg-white/[0.04] text-slate-300 hover:border-[#FF2DA6]/30 hover:bg-[#FF2DA6]/[0.07] hover:text-[#FF2DA6]"
      }`}
    >
      <span>{favorited ? "♥" : "♡"}</span>
      <span>{favorited ? "Saved" : "Save"}</span>
      {count > 0 && (
        <span className="rounded-full bg-white/8 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-400">
          {count}
        </span>
      )}
    </button>
  );
}
