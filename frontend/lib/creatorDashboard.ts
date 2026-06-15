import { prisma } from "@/lib/prisma";
import { readCatalogSnapshotFromStore } from "@/lib/catalogSnapshotStore";
import { getStaticCatalog } from "@/lib/staticCatalog";
import { normalizeStationSong } from "@/lib/stationPlayback";
import { getUpcomingAirings, formatAiring } from "@/lib/airTime";

export type CreatorTrackStatus =
  | "in_review"
  | "priority_review"
  | "live"
  | "processing"
  | "not_selected";

export type CreatorTrack = {
  submissionId: string;
  title: string;
  status: CreatorTrackStatus;
  reviewPaid: boolean;
  songId: string | null;
  plays: number;
  fires: number;
  favorites: number;
  requests: number;
  rotationScore: number;
  nextAiring: string | null;
};

export type CreatorDashboard = {
  artistName: string;
  tracks: CreatorTrack[];
  totals: { plays: number; fires: number; favorites: number; liveTracks: number; bestRank: number | null };
  nextAction: { label: string; href: string } | null;
};

// Everything a signed-in artist's command center needs, resolved from their
// email via the submission record (the reliable account→artist link) and the
// published Song stats. Returns null for users with no submissions so the
// dashboard can fall back to the onboarding view.
export async function getCreatorDashboard(email: string): Promise<CreatorDashboard | null> {
  const submissions = await prisma.artistSubmission.findMany({
    where: { email: { equals: email, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, songTitle: true, artistName: true, status: true,
      reviewPaidAt: true, publishedSongId: true,
    },
  });
  if (submissions.length === 0) return null;

  const songIds = submissions.map((s) => s.publishedSongId).filter((id): id is string => Boolean(id));

  const [songs, requests, shares, favorites] = await Promise.all([
    songIds.length
      ? prisma.song.findMany({ where: { id: { in: songIds } }, include: { queuePreferences: true } })
      : Promise.resolve([]),
    songIds.length
      ? prisma.songRequest.groupBy({ by: ["songId"], where: { songId: { in: songIds } }, _count: { songId: true } })
      : Promise.resolve([] as { songId: string; _count: { songId: number } }[]),
    songIds.length
      ? prisma.analyticsEvent.groupBy({ by: ["songId"], where: { eventName: "SHARE_TRACK_CLICK", songId: { in: songIds } }, _count: { songId: true } })
      : Promise.resolve([] as { songId: string | null; _count: { songId: number } }[]),
    songIds.length
      ? prisma.songFavorite.groupBy({ by: ["songId"], where: { songId: { in: songIds } }, _count: { songId: true } })
      : Promise.resolve([] as { songId: string; _count: { songId: number } }[]),
  ]);

  const songMap = new Map(songs.map((s) => [s.id, s]));
  const reqMap = new Map(requests.map((r) => [r.songId, r._count.songId]));
  const shareMap = new Map(shares.map((e) => [e.songId!, e._count.songId]));
  const favMap = new Map(favorites.map((f) => [f.songId, f._count.songId]));

  // Air times come from the live catalog (deterministic station clock).
  let catalog: ReturnType<typeof normalizeStationSong>[] = [];
  try {
    const snap = await readCatalogSnapshotFromStore();
    catalog = (snap.songs.length ? snap.songs : getStaticCatalog()).map(normalizeStationSong);
  } catch { /* air times optional */ }

  const tracks: CreatorTrack[] = submissions.map((sub) => {
    const song = sub.publishedSongId ? songMap.get(sub.publishedSongId) : null;
    let status: CreatorTrackStatus;
    if (sub.status === "REJECTED") status = "not_selected";
    else if (song && song.packagingStatus === "READY") status = "live";
    else if (song) status = "processing";
    else if (sub.reviewPaidAt) status = "priority_review";
    else status = "in_review";

    const airings = song && status === "live" ? getUpcomingAirings(catalog, song.id, Date.now(), { limit: 1 }) : [];

    return {
      submissionId: sub.id,
      title: sub.songTitle,
      status,
      reviewPaid: Boolean(sub.reviewPaidAt),
      songId: sub.publishedSongId,
      plays: song?.queuePreferences?.playCount ?? 0,
      fires: song?.queuePreferences?.hypeCount ?? 0,
      favorites: (sub.publishedSongId && favMap.get(sub.publishedSongId)) || 0,
      requests: (sub.publishedSongId && reqMap.get(sub.publishedSongId)) || 0,
      rotationScore: song?.queuePreferences?.rotationScore ?? 0,
      nextAiring: airings[0] ? formatAiring(airings[0]) : null,
    };
  });

  const live = tracks.filter((t) => t.status === "live");
  const totals = {
    plays: tracks.reduce((s, t) => s + t.plays, 0),
    fires: tracks.reduce((s, t) => s + t.fires, 0),
    favorites: tracks.reduce((s, t) => s + t.favorites, 0),
    liveTracks: live.length,
    bestRank: live.length ? Math.round(Math.max(...live.map((t) => t.rotationScore))) : null,
  };

  // Single best next action.
  let nextAction: CreatorDashboard["nextAction"] = null;
  const unpaidInReview = tracks.find((t) => t.status === "in_review" && !t.reviewPaid);
  if (tracks.length === 0) nextAction = { label: "Submit your first track", href: "/artist/submit" };
  else if (unpaidInReview) nextAction = { label: "Get priority review on your track", href: "/artist/confirmation" };
  else if (live.length === 0) nextAction = { label: "Submit another track", href: "/artist/submit" };
  else nextAction = { label: "Share your next air time with fans", href: "/artist/dashboard" };

  return { artistName: submissions[0].artistName, tracks, totals, nextAction };
}
