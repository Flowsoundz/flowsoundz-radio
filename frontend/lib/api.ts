import coverMappings from "./coverMappings.json";
import { getAdminCoverSrc, normalizeCoverKey } from "./coverKeys";
import { getCuratedCatalog } from "./curatedCatalog";
import type { AiOnboardProfile } from "./promoOnboarding";
import { Song } from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : "");
const LOCAL_APP_BASE =
  process.env.NEXT_PUBLIC_APP_BASE ||
  (process.env.NODE_ENV === "development" ? "http://127.0.0.1:3000" : "");
const DEFAULT_COVER_SRC = "/covers/default.webp";

const LOCAL_COVER_BY_TITLE: Record<string, string> = coverMappings;

function dedupeCoverSources(sources: string[]): string[] {
  return sources.filter(
    (source, index) => Boolean(source) && sources.indexOf(source) === index,
  );
}

function getLocalCoverSrc(
  song: Pick<Song, "title" | "cover_url" | "cover_file" | "cover_exists">,
): string | string[] {
  const titleKey = normalizeCoverKey(song.title);
  const mappedCoverSrc = LOCAL_COVER_BY_TITLE[titleKey] ?? DEFAULT_COVER_SRC;
  const adminCoverSrc = getAdminCoverSrc(song.title);
  const backendCoverSrc =
    song.cover_exists && song.cover_url ? `${API_BASE}${song.cover_url}` : "";
  const sources = dedupeCoverSources([
    backendCoverSrc,
    mappedCoverSrc,
    adminCoverSrc,
    DEFAULT_COVER_SRC,
  ]);

  return sources.length === 1 ? sources[0] : sources;
}

export async function getSongs(): Promise<Song[]> {
  if (!API_BASE) {
    return getCuratedCatalog();
  }

  try {
    const res = await fetch(`${API_BASE}/songs`, { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to load songs");
    }
    return res.json();
  } catch {
    try {
      const res = await fetch(`${LOCAL_APP_BASE}/api/local-catalog`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to load songs");
      }
      return res.json();
    } catch {
      return getCuratedCatalog();
    }
  }
}

export async function getQueue(vibe?: string): Promise<Song[]> {
  if (!API_BASE) {
    return getCuratedCatalog(vibe);
  }

  const url = vibe
    ? `${API_BASE}/queue?vibe=${encodeURIComponent(vibe)}`
    : `${API_BASE}/queue`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (process.env.NODE_ENV === "development") {
      console.log("[RadioPlayer] queue response", {
        source: "backend",
        url,
        status: res.status,
        ok: res.ok,
      });
    }
    if (!res.ok) {
      throw new Error("Failed to load queue");
    }
    const data = (await res.json()) as Song[];
    if (process.env.NODE_ENV === "development") {
      console.log("[RadioPlayer] queue payload", {
        source: "backend",
        length: data.length,
        firstTrack: data[0] ?? null,
      });
    }
    return data;
  } catch {
    const fallbackUrl = vibe
      ? `${LOCAL_APP_BASE}/api/local-catalog?vibe=${encodeURIComponent(vibe)}`
      : `${LOCAL_APP_BASE}/api/local-catalog`;
    const res = await fetch(fallbackUrl, { cache: "no-store" });
    if (process.env.NODE_ENV === "development") {
      console.log("[RadioPlayer] queue response", {
        source: "local-fallback",
        url: fallbackUrl,
        status: res.status,
        ok: res.ok,
      });
    }
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error || "Failed to load queue");
    }
    const data = (await res.json()) as Song[];
    if (process.env.NODE_ENV === "development") {
      console.log("[RadioPlayer] queue payload", {
        source: "local-fallback",
        length: data.length,
        firstTrack: data[0] ?? null,
      });
    }
    return data;
  }
}

type PromoSubmissionPayload = {
  package_tier: "basic" | "featured" | "sponsored";
  stripe_session_id: string;
  artist_name: string;
  song_title: string;
  email: string;
  vibe: string;
  message: string;
};

type PromoSubmissionResponse = {
  message: string;
  submission: {
    submission_id: string;
    status: string;
    created_at: string;
    payment_status?: string;
  };
};

type AiOnboardPayload = {
  trackTitle: string;
  artistName: string;
  genre: string;
  description: string;
};

export async function submitPromoSubmission(
  payload: PromoSubmissionPayload,
): Promise<PromoSubmissionResponse> {
  const res = await fetch(`${API_BASE}/promo/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.detail || "Failed to submit promo request");
  }

  return data;
}

export async function generateAiOnboarding(
  payload: AiOnboardPayload,
): Promise<AiOnboardProfile> {
  const res = await fetch("/api/ai/onboard", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || "Failed to generate onboarding copy.");
  }

  return data as AiOnboardProfile;
}

type ReleaseSubmissionResponse = {
  message: string;
  submission: {
    submission_id: string;
    status: string;
    created_at: string;
  };
};

export async function submitReleaseSubmission(
  payload: FormData,
): Promise<ReleaseSubmissionResponse> {
  const res = await fetch(`${API_BASE}/submissions/releases`, {
    method: "POST",
    body: payload,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.detail || data?.error || "Failed to submit release");
  }

  return data;
}

type PromoNetworkLeadPayload = {
  artist_name: string;
  track_link: string;
  budget_range: string;
  email: string;
  rights_confirmed: boolean;
};

type PromoNetworkLeadResponse = {
  message: string;
  lead: {
    lead_id: string;
    status: string;
    created_at: string;
  };
};

export async function submitPromoNetworkLead(
  payload: PromoNetworkLeadPayload,
): Promise<PromoNetworkLeadResponse> {
  const res = await fetch(`${API_BASE}/promo/network-leads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.detail || "Failed to submit promo request");
  }

  return data;
}

export function getStreamUrl(filename: string): string {
  return `${API_BASE}/stream/${encodeURIComponent(filename)}`;
}

export function getLocalStreamUrl(filename: string): string {
  return `${LOCAL_APP_BASE}/api/local-stream/${encodeURIComponent(filename)}`;
}

export function getLocalVisualUrl(filename: string): string {
  return `${LOCAL_APP_BASE}/api/local-visual/${encodeURIComponent(filename)}`;
}

export function getHlsUrl(
  song: Pick<Song, "hls_url" | "hls_exists">,
): string | null {
  if (!song.hls_exists || !song.hls_url) {
    return null;
  }

  return `${API_BASE}${song.hls_url}`;
}

export function canUseNativeHls(audio?: HTMLAudioElement | null): boolean {
  const probe =
    audio ?? (typeof Audio !== "undefined" ? new Audio() : null);

  if (!probe) {
    return false;
  }

  return (
    probe.canPlayType("application/vnd.apple.mpegurl") !== "" ||
    probe.canPlayType("audio/mpegurl") !== ""
  );
}

export function getPreferredPlaybackUrl(
  song: Pick<Song, "audio_file" | "hls_url" | "hls_exists" | "local_stream" | "public_audio_url">,
  audio?: HTMLAudioElement | null,
): string {
  if (song.public_audio_url) {
    return song.public_audio_url;
  }

  if (song.local_stream) {
    return getLocalStreamUrl(song.audio_file);
  }

  const hlsUrl = getHlsUrl(song);

  if (hlsUrl && canUseNativeHls(audio)) {
    return hlsUrl;
  }

  return getStreamUrl(song.audio_file);
}

export function getCoverUrl(
  song: Pick<Song, "title" | "cover_url" | "cover_file" | "cover_exists">,
): string | string[] | null {
  return getLocalCoverSrc(song);
}

export function getArtistVisualUrl(
  song: Pick<
    Song,
    "artist_visual_url" | "artist_visual_file" | "artist_visual_exists" | "local_stream"
  >,
): string | null {
  if (song.local_stream && song.artist_visual_file) {
    return getLocalVisualUrl(song.artist_visual_file);
  }

  if (!song.artist_visual_exists || !song.artist_visual_url) {
    return null;
  }

  return `${API_BASE}${song.artist_visual_url}`;
}

export function getDefaultCoverUrl(): string {
  return DEFAULT_COVER_SRC;
}
