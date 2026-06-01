export type UserTier = "listener" | "insider" | "vault";
export type StationMode = "live" | "playable_archive" | "maintenance";

export type Song = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  vibe?: string;
  duration_sec?: number;
  audio_file: string;
  hls_url?: string;
  public_audio_url?: string | null;
  packaging_status?: "pending" | "processing" | "ready" | "failed";
  packaging_error?: string | null;
  is_playable?: boolean;
  cover_file?: string;
  cover_url?: string;
  artist_visual_file?: string | null;
  artist_visual_url?: string | null;
  hls_exists?: boolean;
  cover_exists?: boolean;
  artist_visual_exists?: boolean;
  featured?: boolean;
  sponsored?: boolean;
  access_tier?: UserTier;
  member_release_at?: string | null;
  public_release_at?: string | null;
  is_featured?: boolean;
  is_vault?: boolean;
  behind_the_mix_text?: string | null;
  youtube_url?: string | null;
  local_stream?: boolean;
  is_ai_generated?: boolean;
  ai_platform?: string | null;
  curated_fallback?: boolean;
};

export type VibeOption = {
  label: string;
  value: string;
};

export type ArtistSocialLinks = {
  instagram?: string | null;
  tiktok?: string | null;
  spotify?: string | null;
  youtube?: string | null;
};

export type ArtistContentRecord = {
  slug: string;
  name: string;
  statement: string;
  bio: string;
  rootsLabel: string;
  heroImage: string | string[] | null;
  artistVisualUrl: string | null;
  socialLinks: ArtistSocialLinks;
  supportUrl: string | null;
  supportLabel: string;
  isLiveInVisualizer: boolean;
  liveSessionTitle: string | null;
};

export type ReleaseMilestone = {
  goal: number;
  current: number;
  rewardLabel: string;
};

export type ReleaseRecord = {
  id: string;
  slug: string;
  title: string;
  artistName: string;
  artistSlug: string;
  song: Song;
  coverUrl: string | string[] | null;
  genres: string[];
  vibes: string[];
  isFeatured: boolean;
  isPlayable: boolean;
  isCuratedFallback: boolean;
  story: string | null;
  milestone: ReleaseMilestone;
};

export type ArtistProfileRecord = ArtistContentRecord & {
  songs: Song[];
  releases: ReleaseRecord[];
  rotationEntries: {
    song: Song;
    milestone: ReleaseMilestone;
  }[];
  songCount: number;
  genres: string[];
  vibes: string[];
  featuredRelease: ReleaseRecord | null;
  latestRelease: ReleaseRecord | null;
  featuredSong: Song | null;
  latestSong: Song | null;
  youtubeUrl: string | null;
};

export type CatalogSnapshot = {
  stationMode: StationMode;
  isFallbackCatalog: boolean;
  songs: Song[];
  releases: ReleaseRecord[];
  artists: ArtistProfileRecord[];
};
