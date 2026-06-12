import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readCatalogSnapshotFromStore } from "@/lib/catalogSnapshotStore";
import { getStaticCatalog } from "@/lib/staticCatalog";
import { normalizeStationSong } from "@/lib/stationPlayback";
import { getUpcomingAirings, formatAiring } from "@/lib/airTime";
import { ShareAiringButtons } from "@/components/creator-hub/ShareAiringButtons";

// "Your track airs at 9:42 PM tonight" — the deterministic station clock lets
// us promise artists exact air times. Renders nothing when the signed-in user
// has no on-air tracks, so the dashboard stays clean for new artists.
export async function NextAiringCard() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;

  // The artist's on-air songs: published submissions under this email.
  const submissions = await prisma.artistSubmission.findMany({
    where: { email: { equals: email, mode: "insensitive" }, publishedSongId: { not: null } },
    select: { publishedSongId: true },
  });
  const songIds = submissions
    .map((s) => s.publishedSongId)
    .filter((id): id is string => Boolean(id));
  if (songIds.length === 0) return null;

  const snapshot = await readCatalogSnapshotFromStore();
  const catalog = (snapshot.songs.length > 0 ? snapshot.songs : getStaticCatalog()).map(
    normalizeStationSong,
  );

  const upcoming = songIds
    .flatMap((id) => {
      const song = catalog.find((s) => s.id === id);
      if (!song) return [];
      return getUpcomingAirings(catalog, id).map((a) => ({ song, airing: a }));
    })
    .sort((a, b) => a.airing.startsAtMs - b.airing.startsAtMs)
    .slice(0, 3);
  if (upcoming.length === 0) return null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.flowsoundzradio.com";
  const next = upcoming[0];

  return (
    <section className="mb-10 overflow-hidden rounded-[2rem] border border-[#00FF88]/20 bg-[linear-gradient(135deg,rgba(0,255,136,0.05)_0%,#07111f_60%)] px-6 py-7">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.28em] text-[#00FF88]">
            ● Next Airing
          </p>
          <h3 className="text-xl font-semibold text-white">
            &ldquo;{next.song.title}&rdquo; plays {formatAiring(next.airing)}
          </h3>
          <ul className="mt-3 space-y-1">
            {upcoming.slice(1).map(({ song, airing }) => (
              <li key={`${song.id}-${airing.startsAtMs}`} className="text-sm text-slate-400">
                then &ldquo;{song.title}&rdquo; — {formatAiring(airing)}
              </li>
            ))}
          </ul>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
            FlowSoundz is synchronized radio — everyone hears your track at the same moment.
            Get your fans tuned in for the airing and firing 🔥 together: the station lights
            up and your rotation climbs.
          </p>
        </div>
        <div className="shrink-0 pt-1">
          <ShareAiringButtons
            trackTitle={next.song.title}
            airingLabel={formatAiring(next.airing)}
            siteUrl={siteUrl}
          />
        </div>
      </div>
    </section>
  );
}
