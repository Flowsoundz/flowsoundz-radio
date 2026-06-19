import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EmbedPlayer } from "@/components/EmbedPlayer";
import { getSiteUrl } from "@/lib/siteUrl";

export const dynamic = "force-dynamic";

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ songId: string }>;
}) {
  const { songId } = await params;

  const song = await prisma.song.findUnique({
    where: { id: songId },
    include: { artist: { select: { name: true, slug: true } } },
  }).catch(() => null);

  if (!song) notFound();

  const audioUrl = song.publicAudioUrl || song.audioUrl;
  const coverUrl = song.coverUrl ?? null;
  const artistSlug = song.artist.slug;
  const siteUrl = getSiteUrl();

  return (
    <EmbedPlayer
      songId={song.id}
      title={song.title}
      artist={song.artist.name}
      artistSlug={artistSlug}
      audioUrl={audioUrl}
      coverUrl={coverUrl}
      vibe={song.vibe}
      siteUrl={siteUrl}
    />
  );
}
