import { getArtistVisualUrl, getCoverUrl } from "@/lib/api";
import type { Song } from "@/lib/types";

export type ArtistSocialLinks = {
  instagram?: string | null;
  tiktok?: string | null;
  spotify?: string | null;
  youtube?: string | null;
};

export type ArtistMilestone = {
  goal: number;
  current: number;
  rewardLabel: string;
};

export type ArtistRotationEntry = {
  song: Song;
  milestone: ArtistMilestone;
};

export type ArtistProfile = {
  slug: string;
  name: string;
  songs: Song[];
  rotationEntries: ArtistRotationEntry[];
  songCount: number;
  genres: string[];
  vibes: string[];
  featuredSong: Song | null;
  latestSong: Song | null;
  heroImage: string | string[] | null;
  artistVisualUrl: string | null;
  youtubeUrl: string | null;
  bio: string;
  statement: string;
  rootsLabel: string;
  socialLinks: ArtistSocialLinks;
  supportUrl: string | null;
  supportLabel: string;
  isLiveInVisualizer: boolean;
  liveSessionTitle: string | null;
};

type ArtistEditorialOverride = {
  statement?: string;
  rootsLabel?: string;
  socialLinks?: ArtistSocialLinks;
  supportUrl?: string | null;
  supportLabel?: string;
  isLiveInVisualizer?: boolean;
  liveSessionTitle?: string | null;
};

const ARTIST_EDITORIAL_OVERRIDES: Record<string, ArtistEditorialOverride> = {
  "flowsoundz-select": {
    statement:
      "First person, far from neat. My story lives somewhere between late-night confession, memory, and motion. Every record I release is another version of me trying to make sense of what I survived and what I still want.",
    rootsLabel: "Orlando, FL // Santo Domingo, DR",
    socialLinks: {
      instagram: "https://www.instagram.com/flowsoundzradio/",
      tiktok: "https://www.tiktok.com/@flowsoundzradio",
      spotify: "https://open.spotify.com/search/FlowSoundz%20Select",
      youtube: "https://www.youtube.com/results?search_query=FlowSoundz+Select",
    },
    supportUrl: "/membership",
    supportLabel: "Support Artist / Tipping",
    isLiveInVisualizer: true,
    liveSessionTitle: "Live listening room open",
  },
};

function normalizeArtistName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function slugifyArtistName(name: string) {
  return normalizeArtistName(name)
    .toLowerCase()
    .replace(/&/g, " and ")
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

function buildMilestone(song: Song, index: number): ArtistMilestone {
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

export function buildArtistProfiles(songs: Song[]): ArtistProfile[] {
  const grouped = new Map<string, Song[]>();

  for (const song of songs) {
    const artistName = normalizeArtistName(song.artist);
    if (!artistName) continue;

    const slug = slugifyArtistName(artistName);
    const existing = grouped.get(slug) ?? [];
    existing.push(song);
    grouped.set(slug, existing);
  }

  return Array.from(grouped.entries())
    .map(([slug, artistSongs]) => {
      const orderedSongs = sortSongsForArtist(artistSongs);
      const name = normalizeArtistName(orderedSongs[0]?.artist ?? "");
      const genres = uniqueStrings(orderedSongs.map((song) => song.genre));
      const vibes = uniqueStrings(orderedSongs.map((song) => song.vibe));
      const featuredSong =
        orderedSongs.find((song) => song.featured || song.is_featured) ?? orderedSongs[0] ?? null;
      const latestSong = orderedSongs[0] ?? null;
      const heroImage = featuredSong ? getCoverUrl(featuredSong) : latestSong ? getCoverUrl(latestSong) : null;
      const artistVisualUrl =
        (featuredSong && getArtistVisualUrl(featuredSong)) ||
        (latestSong && getArtistVisualUrl(latestSong)) ||
        null;
      const youtubeUrl =
        orderedSongs.find((song) => song.youtube_url)?.youtube_url ?? null;
      const editorial = ARTIST_EDITORIAL_OVERRIDES[slug] ?? {};
      const statement = editorial.statement ?? buildDefaultStatement(name, vibes);
      const rootsLabel = editorial.rootsLabel ?? "Independent // FlowSoundz Network";
      const socialLinks = editorial.socialLinks ?? {
        spotify: `https://open.spotify.com/search/${encodeURIComponent(name)}`,
        youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(name)}`,
      };
      const rotationEntries = orderedSongs.map((song, index) => ({
        song,
        milestone: buildMilestone(song, index),
      }));

      return {
        slug,
        name,
        songs: orderedSongs,
        rotationEntries,
        songCount: orderedSongs.length,
        genres,
        vibes,
        featuredSong,
        latestSong,
        heroImage,
        artistVisualUrl,
        youtubeUrl,
        bio: buildArtistBio(name, orderedSongs, genres, vibes),
        statement,
        rootsLabel,
        socialLinks,
        supportUrl: editorial.supportUrl ?? "/membership",
        supportLabel: editorial.supportLabel ?? "Support Artist",
        isLiveInVisualizer: editorial.isLiveInVisualizer ?? false,
        liveSessionTitle: editorial.liveSessionTitle ?? null,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function getArtistProfileBySlug(songs: Song[], slug: string) {
  return buildArtistProfiles(songs).find((artist) => artist.slug === slug) ?? null;
}
