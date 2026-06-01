import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ArtistDiscoveryProfile } from "@/components/artists/ArtistDiscoveryProfile";
import { getSongs } from "@/lib/api";
import { getCatalogSnapshot } from "@/lib/catalogSnapshot";

export const dynamic = "force-dynamic";

export default async function ArtistProfilePage(
  props: PageProps<"/artists/[slug]">,
) {
  const { slug } = await props.params;
  const songs = await getSongs();
  const snapshot = getCatalogSnapshot(songs);
  const artist = snapshot.artists.find((entry) => entry.slug === slug) ?? null;
  const isFallbackCatalog = snapshot.isFallbackCatalog;

  if (!artist) {
    notFound();
  }

  return (
    <AppShell
      eyebrow="Artist Profile"
      title={artist.name}
      subtitle={
        isFallbackCatalog
          ? `${artist.bio} This page is currently powered by the curated archive while the live station reconnects.`
          : artist.bio
      }
    >
      <ArtistDiscoveryProfile artist={artist} isFallbackCatalog={isFallbackCatalog} />
    </AppShell>
  );
}
