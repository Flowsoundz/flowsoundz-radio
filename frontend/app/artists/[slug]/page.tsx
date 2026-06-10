import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ArtistDiscoveryProfile } from "@/components/artists/ArtistDiscoveryProfile";
import { FollowButton } from "@/components/FollowButton";
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
    select: { id: true, _count: { select: { followers: true } } },
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
    </AppShell>
  );
}
