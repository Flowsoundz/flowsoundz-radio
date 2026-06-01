export type UserTier = "listener" | "insider" | "vault";

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
