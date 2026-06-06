import type { Song } from "@/lib/types";

export function getBundledAudioUrl(filename: string) {
  return `/audio/${encodeURIComponent(filename)}`;
}

export function getLocalAudioUrl(filename: string) {
  return `/api/local-stream/${encodeURIComponent(filename)}`;
}

export function getLocalVisualUrl(filename: string) {
  return `/api/local-visual/${encodeURIComponent(filename)}`;
}

export function normalizeStationSong(song: Song): Song {
  const publicAudioUrl =
    song.public_audio_url?.trim() ||
    (song.local_stream
      ? getLocalAudioUrl(song.audio_file)
      : getBundledAudioUrl(song.audio_file));

  const artistVisualUrl =
    song.artist_visual_url?.trim() ||
    (song.local_stream && song.artist_visual_file
      ? getLocalVisualUrl(song.artist_visual_file)
      : song.artist_visual_url ?? null);

  return {
    ...song,
    public_audio_url: publicAudioUrl,
    artist_visual_url: artistVisualUrl,
    is_playable: song.is_playable ?? Boolean(publicAudioUrl || song.hls_url),
  };
}
