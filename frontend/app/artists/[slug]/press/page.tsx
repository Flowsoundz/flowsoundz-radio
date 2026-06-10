import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const artist = await prisma.artist.findUnique({ where: { slug }, select: { name: true } });
  return {
    title: artist ? `${artist.name} — Press Kit` : "Press Kit",
  };
}

export default async function PressKitPage({ params }: Props) {
  const { slug } = await params;

  const artist = await prisma.artist.findUnique({
    where: { slug },
    include: {
      profile: true,
      socialLinks: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      songs: {
        where: { isExplicit: false },
        orderBy: [{ isFeatured: "desc" }, { publicReleaseAt: "desc" }, { createdAt: "desc" }],
        include: { queuePreferences: true },
        take: 12,
      },
    },
  });

  if (!artist) notFound();

  const songIds = artist.songs.map((s) => s.id);
  const [requestCounts, shareEvents] = await Promise.all([
    prisma.songRequest.groupBy({
      by: ["songId"],
      where: { songId: { in: songIds } },
      _count: { songId: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["songId"],
      where: { eventName: "SHARE_TRACK_CLICK", songId: { in: songIds } },
      _count: { songId: true },
    }),
  ]);

  const reqMap = new Map(requestCounts.map((r) => [r.songId, r._count.songId]));
  const shareMap = new Map(shareEvents.map((e) => [e.songId!, e._count.songId]));

  const totalPlays = artist.songs.reduce((s, t) => s + (t.queuePreferences?.playCount ?? 0), 0);
  const totalRequests = songIds.reduce((s, id) => s + (reqMap.get(id) ?? 0), 0);
  const totalShares = songIds.reduce((s, id) => s + (shareMap.get(id) ?? 0), 0);

  const VIBE_COLOR: Record<string, string> = {
    CHILL: "bg-cyan-400/10 text-cyan-200 border-cyan-400/20",
    HYPE: "bg-fuchsia-400/10 text-fuchsia-200 border-fuchsia-400/20",
    LATE_NIGHT: "bg-violet-400/10 text-violet-200 border-violet-400/20",
    EMOTIONAL: "bg-amber-400/10 text-amber-200 border-amber-400/20",
    UNSURE: "bg-slate-400/10 text-slate-300 border-slate-400/20",
  };

  const SOCIAL_ICONS: Record<string, string> = {
    INSTAGRAM: "IG", TIKTOK: "TK", SPOTIFY: "SP", YOUTUBE: "YT",
    X: "X", BANDCAMP: "BC", WEBSITE: "WEB",
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      {/* Print controls — hidden in print */}
      <div className="print:hidden flex items-center justify-between px-6 py-4 border-b border-white/8">
        <Link href={`/artists/${slug}`} className="text-sm text-slate-400 hover:text-white transition">
          ← Artist page
        </Link>
        <button
          onClick={() => window.print()}
          className="rounded-full border border-white/10 px-4 py-1.5 text-sm font-semibold text-slate-300 hover:border-white/20 hover:text-white transition"
        >
          Download / Print PDF
        </button>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-12 print:py-6">
        {/* Header */}
        <div className="mb-10 border-b border-white/10 pb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7c4dff] mb-3">Press Kit</p>
          <h1 className="text-4xl font-bold text-white">{artist.name}</h1>
          {artist.profile?.rootsLabel && (
            <p className="mt-1 text-slate-400">{artist.profile.rootsLabel}</p>
          )}
          {(artist.profile?.statement ?? artist.bio) && (
            <p className="mt-5 text-sm leading-7 text-slate-300 max-w-2xl">
              {artist.profile?.statement ?? artist.bio}
            </p>
          )}

          {/* Social links */}
          {artist.socialLinks.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {artist.socialLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300 hover:border-white/20 hover:text-white transition print:text-[10px]"
                >
                  {SOCIAL_ICONS[link.platform] ?? link.platform} ↗
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mb-10 grid grid-cols-3 gap-4">
          {[
            { label: "Station plays", value: totalPlays.toLocaleString() },
            { label: "Song requests", value: totalRequests.toLocaleString() },
            { label: "Shares", value: totalShares.toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5 text-center">
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Discography */}
        <div className="mb-10">
          <h2 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">
            Catalog on FlowSoundz Radio
          </h2>
          <div className="space-y-3">
            {artist.songs.map((song) => {
              const vibeKey = song.vibe.toString().toUpperCase();
              const plays = song.queuePreferences?.playCount ?? 0;
              return (
                <div key={song.id} className="flex items-center gap-4 rounded-[1.2rem] border border-white/8 bg-white/[0.02] px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{song.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{song.genre}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] ${VIBE_COLOR[vibeKey] ?? VIBE_COLOR.UNSURE}`}>
                    {song.vibe.toString().toLowerCase().replace("_", " ")}
                  </span>
                  {plays > 0 && (
                    <span className="text-xs tabular-nums text-slate-500">{plays} plays</span>
                  )}
                  {reqMap.get(song.id) ? (
                    <span className="text-xs tabular-nums text-[#ff2da6]">🔥 {reqMap.get(song.id)}</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/8 pt-8 text-center print:text-left">
          <p className="text-xs text-slate-500">
            Hosted on{" "}
            <a href="https://flowsoundzradio.com" className="text-[#7c4dff] hover:text-[#a78bfa] transition">
              FlowSoundz Radio
            </a>
            {" "}· flowsoundzradio.com/artists/{slug}
          </p>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white; color: black; }
          .print\\:hidden { display: none !important; }
          a { color: inherit; text-decoration: none; }
        }
      `}</style>
    </div>
  );
}
