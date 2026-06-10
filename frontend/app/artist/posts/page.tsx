"use client";

import { useEffect, useState } from "react";
import { CreatorHubShell } from "@/components/creator-hub/CreatorHubShell";
import { ArtistPostComposer } from "@/components/ArtistPostComposer";
import { ArtistPostFeed } from "@/components/ArtistPostFeed";

type Post = {
  id: string;
  body: string;
  imageUrl: string | null;
  createdAt: string;
};

type ArtistInfo = {
  id: string;
  name: string;
};

export default function ArtistPostsPage() {
  const [artist, setArtist] = useState<ArtistInfo | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/artist/profile").then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
      fetch("/api/artist/posts?mine=1").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([profileData, postsData]: [{ artist: ArtistInfo }, { posts?: Post[] } | null]) => {
        setArtist({ id: profileData.artist.id, name: profileData.artist.name });
        setPosts(postsData?.posts ?? []);
      })
      .catch(() => setError("Could not load your artist profile."))
      .finally(() => setLoading(false));
  }, []);

  function handlePosted(post: Post) {
    setPosts((prev) => [post, ...prev]);
  }

  if (loading) {
    return (
      <CreatorHubShell eyebrow="Creator Hub" title="Posts">
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8B5CF6] border-t-transparent" />
        </div>
      </CreatorHubShell>
    );
  }

  if (error || !artist) {
    return (
      <CreatorHubShell eyebrow="Creator Hub" title="Posts">
        <p className="text-sm text-red-400">{error || "No artist linked to your account."}</p>
      </CreatorHubShell>
    );
  }

  return (
    <CreatorHubShell eyebrow="Creator Hub" title="Artist Posts">
      <div className="max-w-2xl space-y-6">
        <ArtistPostComposer onPosted={handlePosted} />
        <div>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Your Recent Posts
          </h2>
          <ArtistPostFeed
            artistId={artist.id}
            artistName={artist.name}
            initialPosts={posts}
            isOwner
          />
        </div>
      </div>
    </CreatorHubShell>
  );
}
