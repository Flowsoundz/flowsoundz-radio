import { getArtistVisualUrl, getCoverUrl } from "@/lib/api";
import type {
  ArtistContentRecord,
  ArtistProfileRecord,
  ArtistSocialLinks,
  CatalogSnapshot,
  ReleaseMilestone,
  ReleaseRecord,
  Song,
  StationMode,
} from "@/lib/types";

type ArtistEditorialOverride = {
  statement?: string;
  rootsLabel?: string;
  heroImage?: string | string[] | null;
  artistVisualUrl?: string | null;
  socialLinks?: ArtistSocialLinks;
  supportUrl?: string | null;
  supportLabel?: string;
  isLiveInVisualizer?: boolean;
  liveSessionTitle?: string | null;
};

type CatalogSnapshotOptions = {
  artistOverrides?: Record<string, ArtistEditorialOverride>;
  milestoneOverrides?: Record<string, ReleaseMilestone>;
};

const ARTIST_EDITORIAL_OVERRIDES: Record<string, ArtistEditorialOverride> = {
  flowsoundz: {
    statement:
      "First person, far from neat. Latin urban producer and artist from Orlando, FL — roots in Santo Domingo, DR. I built FlowSoundz from the inside out: as an artist who needed the platform, and a founder who could create it. Every record I put out is a version of me making sense of what I survived and what I still want.",
    rootsLabel: "Orlando, FL // Santo Domingo, DR",
    heroImage: "/covers/flowsoundz-artist.png",
    artistVisualUrl: "/covers/flowsoundz-artist.png",
    socialLinks: {
      instagram: "https://www.instagram.com/flowsoundzradio/",
      tiktok: "https://www.tiktok.com/@flowsoundzradio",
      spotify: "https://open.spotify.com/search/FlowSoundz",
      youtube: "https://www.youtube.com/@flowsoundzradio",
    },
    supportUrl: "/membership",
    supportLabel: "Support FlowSoundz",
    isLiveInVisualizer: true,
    liveSessionTitle: "FlowSoundz — live in rotation",
  },
};

// Maps old artist aliases to the canonical display name.
// Applied before slugifying so the production DB doesn't need migration.
const ARTIST_NAME_ALIASES: Record<string, string> = {
  "adonyz": "FlowSoundz",
  "naz-t": "FlowSoundz",
  "adonis": "FlowSoundz",
  "flowsoundz-select": "FlowSoundz",
};

// Per-track editorial overrides keyed by audio_file name.
// Applied at render time so the DB doesn't need migration for title renames,
// feat. credits, or playability changes.
type SongOverride = { title?: string; artist?: string; is_playable?: false };
const SONG_OVERRIDES: Record<string, SongOverride> = {
  "find_a_way.mp3":        { artist: "FlowSoundz feat. Adrian 🪐" },
  "no_other.mp3":          { title: "No Where to Go", artist: "FlowSoundz feat. Adrian 🪐" },
  "galacta.mp3":           { title: "Galacta-Adrian", artist: "FlowSoundz feat. Adrian 🪐", is_playable: false },
  "i_just_decided.mp3":    { artist: "FlowSoundz feat. Ezeqiel" },
  "far_away.mp3":          { artist: "FlowSoundz feat. Ezeqiel" },
  "5321_bobby_st_3.mp3":   { title: "No Te Imaginas" },
  "baby_tu_sabes.mp3":     { title: "Apaga el Mundo" },
  "adonis.mp3":            { is_playable: false },
};

export function applySongOverrides(song: Song): Song {
  const override = SONG_OVERRIDES[song.audio_file ?? ""] ?? {};
  if (Object.keys(override).length === 0) return song;
  return {
    ...song,
    ...(override.title !== undefined    ? { title: override.title }       : {}),
    ...(override.artist !== undefined   ? { artist: override.artist }     : {}),
    ...(override.is_playable === false  ? { is_playable: false }          : {}),
  };
}

function normalizeArtistName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function resolveArtistName(raw: string): string {
  const normalized = normalizeArtistName(raw);
  const slug = slugifyArtistName(normalized);
  return ARTIST_NAME_ALIASES[slug] ?? normalized;
}

export function slugifyArtistName(name: string) {
  return normalizeArtistName(name)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function slugifyReleaseTitle(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function sortSongsForArtist(songs: Song[]) {
  return [...songs].sort((left, right) => {
    const leftFeatured = Number(Boolean(left.featured || left.is_featured));
    const rightFeatured = Number(Boolean(right.featured || right.is_featured));
    if (leftFeatured !== rightFeatured) {
      return rightFeatured - leftFeatured;
    }

    const leftPublic = left.public_release_at ? Date.parse(left.public_release_at) : 0;
    const rightPublic = right.public_release_at ? Date.parse(right.public_release_at) : 0;
    if (leftPublic !== rightPublic) {
      return rightPublic - leftPublic;
    }

    return left.title.localeCompare(right.title);
  });
}

function buildArtistBio(name: string, songs: Song[], genres: string[], vibes: string[]) {
  const genreLabel =
    genres.length > 0 ? genres.slice(0, 2).join(" / ") : "independent radio";
  const vibeLabel =
    vibes.length > 0 ? vibes.slice(0, 3).join(", ") : "multiple station moods";

  return `${name} is currently in FlowSoundz rotation with ${songs.length} track${
    songs.length === 1 ? "" : "s"
  } spanning ${genreLabel}. This profile is curated from the live catalog and highlights the artist's presence across ${vibeLabel}.`;
}

function buildDefaultStatement(name: string, vibes: string[]) {
  const vibeLabel = vibes.length > 0 ? vibes.slice(0, 2).join(" and ") : "late-night";
  return `${name} is building a ${vibeLabel} lane inside FlowSoundz — personal writing, high-contrast mood shifts, and records designed to connect fast with listeners who care about atmosphere as much as hooks.`;
}

function buildMilestone(song: Song, index: number): ReleaseMilestone {
  const goal = index === 0 ? 500 : index === 1 ? 350 : 200;
  const current = Math.max(24, goal - (index + 1) * 70 + (song.title.length % 33));
  const rewardLabel =
    index === 0
      ? "Unlock exclusive content"
      : index === 1
        ? "Unlock visualizer session"
        : "Unlock artist drop";

  return { goal, current: Math.min(current, goal), rewardLabel };
}

function getStationMode(songs: Song[]): StationMode {
  if (songs.length === 0) {
    return "maintenance";
  }

  if (songs.some((song) => song.curated_fallback)) {
    return songs.some((song) => song.is_playable) ? "playable_archive" : "maintenance";
  }

  return "live";
}

function buildReleaseRecord(
  song: Song,
  index: number,
  milestoneOverride?: ReleaseMilestone,
): ReleaseRecord {
  const artistName = resolveArtistName(song.artist);
  const artistSlug = slugifyArtistName(artistName);

  return {
    id: song.id,
    slug: slugifyReleaseTitle(song.title),
    title: song.title,
    artistName,
    artistSlug,
    song,
    coverUrl: getCoverUrl(song),
    genres: uniqueStrings([song.genre]),
    vibes: uniqueStrings([song.vibe]),
    isFeatured: Boolean(song.featured || song.is_featured),
    isPlayable: Boolean(song.is_playable),
    isCuratedFallback: Boolean(song.curated_fallback),
    story: song.behind_the_mix_text ?? null,
    milestone: milestoneOverride ?? buildMilestone(song, index),
  };
}

function buildArtistContentRecord(
  slug: string,
  name: string,
  songs: Song[],
  artistOverrides: Record<string, ArtistEditorialOverride>,
): ArtistContentRecord {
  const orderedSongs = sortSongsForArtist(songs);
  const featuredSong =
    orderedSongs.find((song) => song.featured || song.is_featured) ?? orderedSongs[0] ?? null;
  const latestSong = orderedSongs[0] ?? null;
  const genres = uniqueStrings(orderedSongs.map((song) => song.genre));
  const vibes = uniqueStrings(orderedSongs.map((song) => song.vibe));
  const editorial = artistOverrides[slug] ?? ARTIST_EDITORIAL_OVERRIDES[slug] ?? {};

  return {
    slug,
    name,
    statement: editorial.statement ?? buildDefaultStatement(name, vibes),
    bio: buildArtistBio(name, orderedSongs, genres, vibes),
    rootsLabel: editorial.rootsLabel ?? "Independent // FlowSoundz Network",
    heroImage:
      editorial.heroImage ??
      (featuredSong ? getCoverUrl(featuredSong) : latestSong ? getCoverUrl(latestSong) : null),
    artistVisualUrl:
      editorial.artistVisualUrl ??
      ((featuredSong && getArtistVisualUrl(featuredSong)) ||
        (latestSong && getArtistVisualUrl(latestSong)) ||
        null),
    socialLinks:
      editorial.socialLinks ?? {
        spotify: `https://open.spotify.com/search/${encodeURIComponent(name)}`,
        youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(name)}`,
      },
    supportUrl: editorial.supportUrl ?? "/membership",
    supportLabel: editorial.supportLabel ?? "Support Artist",
    isLiveInVisualizer: editorial.isLiveInVisualizer ?? false,
    liveSessionTitle: editorial.liveSessionTitle ?? null,
  };
}

export function getCatalogSnapshot(
  songs: Song[],
  options: CatalogSnapshotOptions = {},
): CatalogSnapshot {
  const artistOverrides = options.artistOverrides ?? {};
  const milestoneOverrides = options.milestoneOverrides ?? {};
  const grouped = new Map<string, Song[]>();

  for (const song of songs) {
    const artistName = resolveArtistName(song.artist);
    if (!artistName) continue;

    const slug = slugifyArtistName(artistName);
    const existing = grouped.get(slug) ?? [];
    existing.push(song);
    grouped.set(slug, existing);
  }

  const artists: ArtistProfileRecord[] = Array.from(grouped.entries())
    .map(([slug, artistSongs]) => {
      const orderedSongs = sortSongsForArtist(artistSongs);
      const name = resolveArtistName(orderedSongs[0]?.artist ?? "");
      const genres = uniqueStrings(orderedSongs.map((song) => song.genre));
      const vibes = uniqueStrings(orderedSongs.map((song) => song.vibe));
      const releases = orderedSongs.map((song, index) =>
        buildReleaseRecord(song, index, milestoneOverrides[song.id]),
      );
      const content = buildArtistContentRecord(slug, name, orderedSongs, artistOverrides);

      return {
        ...content,
        songs: orderedSongs,
        releases,
        rotationEntries: releases.map((release) => ({
          song: release.song,
          milestone: release.milestone,
        })),
        songCount: orderedSongs.length,
        genres,
        vibes,
        featuredRelease: releases.find((release) => release.isFeatured) ?? releases[0] ?? null,
        latestRelease: releases[0] ?? null,
        featuredSong: releases.find((release) => release.isFeatured)?.song ?? releases[0]?.song ?? null,
        latestSong: releases[0]?.song ?? null,
        youtubeUrl:
          orderedSongs.find((song) => song.youtube_url)?.youtube_url ?? null,
      } satisfies ArtistProfileRecord;
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  const releases = artists.flatMap((artist) => artist.releases);

  return {
    stationMode: getStationMode(songs),
    isFallbackCatalog: songs.some((song) => song.curated_fallback),
    songs,
    releases,
    artists,
  };
}

export function getArtistProfileRecordBySlug(songs: Song[], slug: string) {
  return getCatalogSnapshot(songs).artists.find((artist) => artist.slug === slug) ?? null;
}
