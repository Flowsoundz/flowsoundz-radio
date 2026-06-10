import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ArtistDiscoveryProfile } from "@/components/artists/ArtistDiscoveryProfile";
import { FollowButton } from "@/components/FollowButton";
import { ArtistPostFeed } from "@/components/ArtistPostFeed";
import { readCatalogSnapshotFromStore } from "@/lib/catalogSnapshotStore";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ArtistProfilePage(
  props: PageProps<"/artists/[slug]">,
) {
  const { slug } = await props.params;
  const snapshot = await readCatalogSnapshotFromStore();
  const artist = snapshot.artists.find((entry) => entry.slug === slug) ?? null;
  const isFallbackCatalog = snapshot.isFallbackCatalog;

  if (!artist) {
    notFound();
  }

  const artistDb = await prisma.artist.findUnique({
    where: { slug },
    select: {
      id: true,
      _count: { select: { followers: true } },
      posts: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, body: true, imageUrl: true, createdAt: true },
      },
    },
  });

  return (
    <AppShell
      eyebrow="Artist Profile"
      title={artist.name}
      subtitle={artist.bio}
    >
      {artistDb && (
        <div className="mb-6 flex items-center gap-3">
          <FollowButton artistId={artistDb.id} initialCount={artistDb._count.followers} />
          {artistDb._count.followers > 0 && (
            <span className="text-xs text-slate-500">{artistDb._count.followers.toLocaleString()} follower{artistDb._count.followers !== 1 ? "s" : ""}</span>
          )}
        </div>
      )}
      <ArtistDiscoveryProfile artist={artist} isFallbackCatalog={isFallbackCatalog} />
      {artistDb && artistDb.posts.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Updates from {artist.name}
          </h2>
          <ArtistPostFeed
            artistId={artistDb.id}
            artistName={artist.name}
            initialPosts={artistDb.posts.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }))}
          />
        </div>
      )}
    </AppShell>
  );
}
