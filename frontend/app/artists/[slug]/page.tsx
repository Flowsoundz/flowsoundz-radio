import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ArtistDiscoveryProfile } from "@/components/artists/ArtistDiscoveryProfile";
import { getSongs } from "@/lib/api";
import { getArtistProfileBySlug } from "@/lib/artists";

export const dynamic = "force-dynamic";

export default async function ArtistProfilePage(
  props: PageProps<"/artists/[slug]">,
) {
  const { slug } = await props.params;
  const songs = await getSongs();
  const artist = getArtistProfileBySlug(songs, slug);
  const isFallbackCatalog = songs.some((song) => song.curated_fallback);

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
