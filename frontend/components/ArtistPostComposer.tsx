"use client";

import { useState } from "react";

type Post = {
  id: string;
  body: string;
  imageUrl: string | null;
  createdAt: string;
};

export function ArtistPostComposer({ onPosted }: { onPosted?: (post: Post) => void }) {
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    setError("");
    try {
      const res = await fetch("/api/artist/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      const data = (await res.json()) as { post?: Post; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Post failed.");
      setBody("");
      if (data.post && onPosted) onPosted(data.post);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error posting.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <form onSubmit={(e) => { void submit(e); }} className="rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 p-5 space-y-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">New Post</h2>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share an update with your followers…"
        rows={3}
        maxLength={1000}
        className="w-full rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-[#7c4dff]/40 focus:outline-none resize-none transition"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] text-slate-600 tabular-nums">{body.length}/1000</span>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-red-400">{error}</span>}
          <button
            type="submit"
            disabled={posting || !body.trim()}
            className="rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-5 py-2 text-xs font-bold text-white shadow-[0_0_12px_rgba(0,229,255,0.22)] transition hover:shadow-[0_0_20px_rgba(0,229,255,0.38)] disabled:opacity-50"
          >
            {posting ? "Posting…" : "Post Update"}
          </button>
        </div>
      </div>
      <p className="text-[11px] text-slate-600">Followers with notifications enabled will be notified when you post.</p>
    </form>
  );
}
