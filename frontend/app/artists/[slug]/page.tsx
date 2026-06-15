import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ArtistDiscoveryProfile } from "@/components/artists/ArtistDiscoveryProfile";
import { FollowButton } from "@/components/FollowButton";
import { ArtistPostFeed } from "@/components/ArtistPostFeed";
import { readCatalogSnapshotFromStore } from "@/lib/catalogSnapshotStore";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.flowsoundzradio.com";

function absUrl(path: string | null | undefined): string {
  if (!path) return `${SITE_URL}/brand/flowsoundz-fr-appicon-dark.png`;
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

// Rich social-preview cards so shared artist links look professional — the
// difference between a fan clicking through and scrolling past.
export async function generateMetadata(
  props: PageProps<"/artists/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const snapshot = await readCatalogSnapshotFromStore();
  const artist = snapshot.artists.find((a) => a.slug === slug);
  if (!artist) return { title: "Artist — FlowSoundz Radio" };

  const hero = Array.isArray(artist.heroImage) ? artist.heroImage[0] : artist.heroImage;
  const cover = absUrl(hero ?? artist.songs?.[0]?.cover_url ?? null);
  const title = `${artist.name} — on FlowSoundz Radio`;
  const description =
    artist.statement?.trim() || artist.bio?.trim() || `${artist.name} is in rotation on FlowSoundz Radio — bilingual after-hours R&B & urbano.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      url: `${SITE_URL}/artists/${slug}`,
      images: [{ url: cover, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description, images: [cover] },
  };
}

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

  // Lightweight social proof: total plays + fires across this artist's catalog.
  const songIds = (artist.songs ?? []).map((s) => s.id).filter(Boolean) as string[];
  let totalPlays = 0;
  let totalFires = 0;
  if (songIds.length) {
    try {
      const agg = await prisma.queuePreference.aggregate({
        where: { songId: { in: songIds } },
        _sum: { playCount: true, hypeCount: true },
      });
      totalPlays = agg._sum.playCount ?? 0;
      totalFires = agg._sum.hypeCount ?? 0;
    } catch {
      // stats are best-effort — never block the profile from rendering
    }
  }
  const trackCount = songIds.length;
  const followerCount = artistDb?._count.followers ?? 0;

  return (
    <AppShell
      eyebrow="Artist Profile"
      title={artist.name}
      subtitle={artist.bio}
    >
      {/* ── Social-proof + Listen CTA strip — the conversion hook for shared
            links. Numbers prove the artist is real & in rotation; the button
            sends fans straight to the station. ── */}
      <div className="mb-8 overflow-hidden rounded-[1.6rem] border border-white/8 bg-[linear-gradient(135deg,#0c1328_0%,#07111f_60%,#050816_100%)] p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-3 gap-4 sm:gap-6">
            <div>
              <p className="text-xl font-bold text-[#00e5ff] sm:text-2xl">{totalPlays.toLocaleString()}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Plays</p>
            </div>
            <div>
              <p className="text-xl font-bold text-[#FF2DA6] sm:text-2xl">{totalFires.toLocaleString()}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">🔥 Fires</p>
            </div>
            <div>
              <p className="text-xl font-bold text-violet-300 sm:text-2xl">{trackCount}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Track{trackCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            {artistDb && <FollowButton artistId={artistDb.id} initialCount={followerCount} />}
            <Link
              href="/radio"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_22px_rgba(0,229,255,0.3)] transition hover:shadow-[0_0_36px_rgba(0,229,255,0.5)]"
            >
              ▸ Listen on FlowSoundz
            </Link>
          </div>
        </div>
        {followerCount > 0 && (
          <p className="mt-4 text-xs text-slate-500">
            {followerCount.toLocaleString()} follower{followerCount === 1 ? "" : "s"} on FlowSoundz Radio
          </p>
        )}
      </div>
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
