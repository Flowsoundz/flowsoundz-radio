import type { Song, UserTier } from "./types";

const DEMO_TIER = process.env.NEXT_PUBLIC_DEMO_TIER;

export const DEFAULT_USER_TIER: UserTier =
  DEMO_TIER === "listener" || DEMO_TIER === "insider" || DEMO_TIER === "vault"
    ? DEMO_TIER
    : "vault";

const TIER_RANK: Record<UserTier, number> = {
  listener: 0,
  insider: 1,
  vault: 2,
};

function toTimestamp(value?: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function getRequiredAccessTier(
  song: Pick<Song, "access_tier" | "is_vault">,
): UserTier {
  if (song.is_vault) {
    return "vault";
  }

  return song.access_tier ?? "listener";
}

export function isTrackUnlockedYet(
  song: Pick<Song, "member_release_at" | "public_release_at">,
  now = new Date(),
): boolean {
  const nowTimestamp = now.getTime();
  const memberReleaseAt = toTimestamp(song.member_release_at);
  const publicReleaseAt = toTimestamp(song.public_release_at);

  if (publicReleaseAt !== null && nowTimestamp >= publicReleaseAt) {
    return true;
  }

  if (memberReleaseAt !== null && nowTimestamp >= memberReleaseAt) {
    return true;
  }

  return memberReleaseAt === null && publicReleaseAt === null;
}

export function isTrackInMembersEarlyWindow(
  song: Pick<Song, "member_release_at" | "public_release_at">,
  now = new Date(),
): boolean {
  const nowTimestamp = now.getTime();
  const memberReleaseAt = toTimestamp(song.member_release_at);
  const publicReleaseAt = toTimestamp(song.public_release_at);

  return (
    memberReleaseAt !== null &&
    publicReleaseAt !== null &&
    nowTimestamp >= memberReleaseAt &&
    nowTimestamp < publicReleaseAt
  );
}

export function canUserTierAccessTrack(
  song: Pick<
    Song,
    "access_tier" | "is_vault" | "member_release_at" | "public_release_at"
  >,
  tier: UserTier = DEFAULT_USER_TIER,
  now = new Date(),
): boolean {
  const nowTimestamp = now.getTime();
  const memberReleaseAt = toTimestamp(song.member_release_at);
  const publicReleaseAt = toTimestamp(song.public_release_at);

  if (publicReleaseAt !== null) {
    if (nowTimestamp >= publicReleaseAt) {
      return true;
    }

    if (memberReleaseAt === null) {
      return false;
    }
  }

  if (memberReleaseAt !== null) {
    if (nowTimestamp < memberReleaseAt) {
      return false;
    }

    return TIER_RANK[tier] >= TIER_RANK[getRequiredAccessTier(song)];
  }

  return TIER_RANK[tier] >= TIER_RANK[getRequiredAccessTier(song)];
}

export function isTrackFeatured(
  song: Pick<Song, "featured" | "is_featured">,
): boolean {
  return Boolean(song.is_featured ?? song.featured);
}
