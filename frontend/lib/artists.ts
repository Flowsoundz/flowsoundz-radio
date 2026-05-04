import { getCoverUrl } from "@/lib/api";
import type { Song } from "@/lib/types";

export type ArtistProfile = {
  slug: string;
  name: string;
  songs: Song[];
  songCount: number;
  genres: string[];
  vibes: string[];
  featuredSong: Song | null;
  latestSong: Song | null;
  heroImage: string | string[] | null;
  youtubeUrl: string | null;
  bio: string;
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
      const youtubeUrl =
        orderedSongs.find((song) => song.youtube_url)?.youtube_url ?? null;

      return {
        slug,
        name,
        songs: orderedSongs,
        songCount: orderedSongs.length,
        genres,
        vibes,
        featuredSong,
        latestSong,
        heroImage,
        youtubeUrl,
        bio: buildArtistBio(name, orderedSongs, genres, vibes),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function getArtistProfileBySlug(songs: Song[], slug: string) {
  return buildArtistProfiles(songs).find((artist) => artist.slug === slug) ?? null;
}
