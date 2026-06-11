import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  PackagingStatus,
  SocialPlatform,
  SongVibe,
  SupportPlatform,
  VisualizerSessionStatus,
  type Prisma,
} from "@prisma/client";
import { applySongOverrides, getCatalogSnapshot, slugifyArtistName } from "@/lib/catalogSnapshot";
import { prisma } from "@/lib/prisma";
import { getCuratedCatalog } from "@/lib/curatedCatalog";
import { getStaticCatalog } from "@/lib/staticCatalog";
import type {
  ArtistSocialLinks,
  CatalogSnapshot,
  ReleaseMilestone,
  Song,
} from "@/lib/types";

const LOCAL_CATALOG_PATH = path.resolve(
  process.cwd(),
  "../backend/app/data/catalog.json",
);

const SHOULD_USE_PRISMA = Boolean(process.env.DATABASE_URL?.trim());
const CAN_USE_LOCAL_FILE_FALLBACK =
  process.env.NODE_ENV !== "production" && !process.env.VERCEL;

export const CATALOG_SNAPSHOT_STORAGE_MODE = SHOULD_USE_PRISMA
  ? "prisma"
  : CAN_USE_LOCAL_FILE_FALLBACK
    ? "file"
    : "curated";

type PrismaCatalogArtist = Prisma.ArtistGetPayload<{
  include: {
    profile: true;
    socialLinks: {
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }];
    };
    supportLinks: {
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }];
    };
    visualizerSessions: {
      where: { status: "LIVE" };
      orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }];
      take: 1;
    };
    songs: {
      include: {
        milestones: {
          where: { isActive: true };
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }];
        };
      };
      orderBy: [{ isFeatured: "desc" }, { publicReleaseAt: "desc" }, { createdAt: "desc" }];
    };
  };
}>;

function fromPrismaVibe(vibe: SongVibe): string {
  switch (vibe) {
    case SongVibe.HYPE:
      return "hype";
    case SongVibe.LATE_NIGHT:
      return "late_night";
    case SongVibe.EMOTIONAL:
      return "emotional";
    case SongVibe.UNSURE:
      return "all";
    case SongVibe.CHILL:
    default:
      return "chill";
  }
}

function fromPackagingStatus(
  status: PackagingStatus | null,
): Song["packaging_status"] | undefined {
  switch (status) {
    case PackagingStatus.PENDING:
      return "pending";
    case PackagingStatus.PROCESSING:
      return "processing";
    case PackagingStatus.READY:
      return "ready";
    case PackagingStatus.FAILED:
      return "failed";
    default:
      return undefined;
  }
}

function buildSocialLinks(
  links: PrismaCatalogArtist["socialLinks"],
): ArtistSocialLinks {
  const socialLinks: ArtistSocialLinks = {};

  for (const link of links) {
    switch (link.platform) {
      case SocialPlatform.INSTAGRAM:
        socialLinks.instagram = link.url;
        break;
      case SocialPlatform.TIKTOK:
        socialLinks.tiktok = link.url;
        break;
      case SocialPlatform.SPOTIFY:
        socialLinks.spotify = link.url;
        break;
      case SocialPlatform.YOUTUBE:
        socialLinks.youtube = link.url;
        break;
      default:
        break;
    }
  }

  return socialLinks;
}

function getPrimarySupportLink(links: PrismaCatalogArtist["supportLinks"]) {
  return (
    links.find((link) => link.isPrimary) ??
    links.find((link) => link.platform === SupportPlatform.MEMBERSHIP) ??
    links[0] ??
    null
  );
}

function mapMilestone(
  milestone: PrismaCatalogArtist["songs"][number]["milestones"][number],
): ReleaseMilestone {
  return {
    goal: milestone.goalTarget,
    current: milestone.currentCount,
    rewardLabel: milestone.rewardTitle,
  };
}

function mapPrismaSong(
  artist: PrismaCatalogArtist,
  song: PrismaCatalogArtist["songs"][number],
): Song {
  const featuredTrackId = artist.profile?.featuredTrackId ?? null;
  const isFeatured = song.isFeatured || featuredTrackId === song.id;
  const primaryAudioUrl =
    song.publicAudioUrl?.trim() || song.audioUrl?.trim() || undefined;

  return {
    id: song.id,
    slug: song.slug,
    title: song.title,
    artist: artist.name,
    album: song.album ?? undefined,
    genre: song.genre,
    vibe: fromPrismaVibe(song.vibe),
    duration_sec: song.durationSec ?? undefined,
    audio_file: song.audioFile ?? `${song.slug}.mp3`,
    hls_url: song.hlsUrl ?? undefined,
    public_audio_url: primaryAudioUrl ?? null,
    packaging_status: fromPackagingStatus(song.packagingStatus),
    packaging_error: song.packagingError ?? null,
    is_playable: Boolean(primaryAudioUrl || song.hlsUrl),
    cover_file: song.coverFile ?? undefined,
    cover_url: song.coverUrl ?? undefined,
    artist_visual_file: song.artistVisualFile ?? null,
    artist_visual_url: song.artistVisualUrl ?? null,
    hls_exists: song.hlsExists,
    cover_exists: song.coverExists || Boolean(song.coverUrl || song.coverFile),
    artist_visual_exists:
      song.artistVisualExists || Boolean(song.artistVisualUrl || song.artistVisualFile),
    featured: isFeatured,
    is_featured: isFeatured,
    is_vault: song.isVault,
    access_tier: song.accessTier as Song["access_tier"],
    member_release_at: song.memberReleaseAt?.toISOString() ?? null,
    public_release_at:
      song.publicReleaseAt?.toISOString() ?? song.releaseAt?.toISOString() ?? null,
    behind_the_mix_text: song.behindTheMixText ?? null,
    youtube_url: song.youtubeUrl ?? null,
    local_stream: song.localStream,
    is_explicit: song.isExplicit,
    is_ai_generated: song.isAiGenerated,
    ai_platform: song.aiPlatform ?? null,
    curated_fallback: song.curatedFallback,
  };
}

async function readLocalCatalogSongs(): Promise<Song[]> {
  if (!CAN_USE_LOCAL_FILE_FALLBACK) {
    return getCuratedCatalog();
  }

  try {
    const catalogRaw = await readFile(LOCAL_CATALOG_PATH, "utf8");
    const catalog = JSON.parse(catalogRaw) as Song[];
    return catalog.map((song) => applySongOverrides({
      ...song,
      is_playable: true,
      local_stream: true,
      packaging_status: "ready",
      artist_visual_exists: Boolean(song.artist_visual_file),
      artist_visual_url: song.artist_visual_file
        ? `/api/local-visual/${encodeURIComponent(song.artist_visual_file)}`
        : null,
    }));
  } catch {
    return getCuratedCatalog();
  }
}

async function readCatalogSnapshotFromPrisma(): Promise<CatalogSnapshot> {
  const artists = await prisma.artist.findMany({
    orderBy: { name: "asc" },
    include: {
      profile: true,
      socialLinks: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      supportLinks: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      visualizerSessions: {
        where: { status: VisualizerSessionStatus.LIVE },
        orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
        take: 1,
      },
      songs: {
        include: {
          milestones: {
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
        orderBy: [{ isFeatured: "desc" }, { publicReleaseAt: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  const songs: Song[] = [];
  const artistOverrides: Record<
    string,
    {
      statement?: string;
      rootsLabel?: string;
      heroImage?: string | string[] | null;
      artistVisualUrl?: string | null;
      socialLinks?: ArtistSocialLinks;
      supportUrl?: string | null;
      supportLabel?: string;
      isLiveInVisualizer?: boolean;
      liveSessionTitle?: string | null;
    }
  > = {};
  const milestoneOverrides: Record<string, ReleaseMilestone> = {};

  for (const artist of artists) {
    const slug = artist.slug || slugifyArtistName(artist.name);
    const primarySupportLink = getPrimarySupportLink(artist.supportLinks);
    const liveSession = artist.visualizerSessions[0] ?? null;

    artistOverrides[slug] = {
      statement: artist.profile?.statement ?? artist.bio ?? undefined,
      rootsLabel:
        artist.profile?.rootsLabel ??
        ([
          artist.profile?.primaryCity,
          artist.profile?.primaryRegion,
          artist.profile?.primaryCountry,
        ]
          .filter(Boolean)
          .join(", ") || undefined),
      heroImage: artist.profile?.heroImageUrl ?? undefined,
      artistVisualUrl:
        artist.profile?.heroVideoUrl ??
        artist.profile?.heroVideoPosterUrl ??
        undefined,
      socialLinks: buildSocialLinks(artist.socialLinks),
      supportUrl: primarySupportLink?.url ?? undefined,
      supportLabel:
        artist.profile?.supportLabel ??
        primarySupportLink?.label ??
        "Support Artist",
      isLiveInVisualizer: Boolean(liveSession),
      liveSessionTitle: liveSession?.title ?? liveSession?.teaserText ?? null,
    };

    for (const song of artist.songs) {
      // Songs still in the mastering pipeline (PENDING/PROCESSING/FAILED)
      // are not broadcast-ready — keep them out of the public catalog until
      // the worker marks them READY. Legacy/manual songs (null status) pass.
      if (song.packagingStatus && song.packagingStatus !== "READY") {
        continue;
      }
      songs.push(applySongOverrides(mapPrismaSong(artist, song)));

      const primaryMilestone = song.milestones[0] ?? null;
      if (primaryMilestone) {
        milestoneOverrides[song.id] = mapMilestone(primaryMilestone);
      }
    }
  }

  // DB songs ADD to the built-in catalog — they must never replace it.
  // (Before this merge, the first ingested DB song silently evicted all 55
  // static tracks and took the station off air.)
  const seenIds = new Set(songs.map((s) => s.id));
  const seenSlugs = new Set(songs.map((s) => s.slug).filter(Boolean));
  for (const staticSong of getStaticCatalog()) {
    if (seenIds.has(staticSong.id)) continue;
    if (staticSong.slug && seenSlugs.has(staticSong.slug)) continue;
    songs.push(staticSong);
  }

  return getCatalogSnapshot(songs, {
    artistOverrides,
    milestoneOverrides,
  });
}

export async function readCatalogSnapshotFromStore(): Promise<CatalogSnapshot> {
  if (SHOULD_USE_PRISMA) {
    return readCatalogSnapshotFromPrisma();
  }

  const songs = await readLocalCatalogSongs();
  return getCatalogSnapshot(songs);
}
