"use client";

import { useEffect, useState } from "react";

type Post = {
  id: string;
  body: string;
  imageUrl: string | null;
  createdAt: string;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type Props = {
  artistId: string;
  artistName: string;
  initialPosts?: Post[];
  isOwner?: boolean;
};

export function ArtistPostFeed({ artistId, artistName, initialPosts, isOwner }: Props) {
  const [posts, setPosts] = useState<Post[]>(initialPosts ?? []);
  const [loading, setLoading] = useState(!initialPosts);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (initialPosts) return;
    fetch(`/api/artist/posts?artistId=${encodeURIComponent(artistId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { posts?: Post[] } | null) => { if (d?.posts) setPosts(d.posts); })
      .finally(() => setLoading(false));
  }, [artistId, initialPosts]);

  async function deletePost(id: string) {
    setDeleting(id);
    try {
      await fetch(`/api/artist/posts/${id}`, { method: "DELETE" });
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-[1.4rem] border border-white/5 bg-white/[0.03]" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-[1.4rem] border border-white/6 bg-white/[0.02] px-6 py-8 text-center">
        <p className="text-sm text-slate-500">{artistName} hasn&apos;t posted yet.</p>
        {isOwner && (
          <p className="mt-1 text-xs text-slate-600">Use the post composer above to share an update.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <div key={post.id} className="rounded-[1.4rem] border border-white/8 bg-[#0B1020]/70 px-5 py-4">
          {post.imageUrl && (
            <img src={post.imageUrl} alt="" className="mb-3 w-full rounded-xl object-cover max-h-64" />
          )}
          <p className="whitespace-pre-wrap text-sm text-slate-200 leading-relaxed">{post.body}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-600">{timeAgo(post.createdAt)}</span>
            {isOwner && (
              <button
                type="button"
                onClick={() => void deletePost(post.id)}
                disabled={deleting === post.id}
                className="text-[11px] text-slate-600 hover:text-red-400 transition disabled:opacity-40"
              >
                {deleting === post.id ? "Deleting…" : "Delete"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
