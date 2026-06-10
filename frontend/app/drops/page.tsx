import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { DropCard } from "@/components/DropCard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Drops — FlowSoundz Radio",
  description: "Exclusive drops, vault early access, and upcoming releases from FlowSoundz artists.",
};

export const revalidate = 60;

export default async function DropsPage() {
  const session = await auth();
  const userTier = (session?.user as { tier?: string } | undefined)?.tier ?? "FREE";
  const tier = (["FREE", "INSIDER", "VAULT"].includes(userTier) ? userTier : "FREE") as "FREE" | "INSIDER" | "VAULT";

  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86_400_000);

  const [upcoming, recentlyDropped] = await Promise.all([
    prisma.song.findMany({
      where: {
        OR: [
          { memberReleaseAt: { gt: now } },
          { publicReleaseAt: { gt: now } },
        ],
      },
      orderBy: [
        { memberReleaseAt: "asc" },
        { publicReleaseAt: "asc" },
      ],
      include: {
        artist: { select: { name: true, slug: true } },
      },
      take: 20,
    }),
    prisma.song.findMany({
      where: {
        OR: [
          { memberReleaseAt: { gte: fourteenDaysAgo, lte: now } },
          { publicReleaseAt: { gte: fourteenDaysAgo, lte: now } },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        artist: { select: { name: true, slug: true } },
      },
      take: 10,
    }),
  ]);

  const toCardProps = (song: typeof upcoming[number], isDropped: boolean) => ({
    id: song.id,
    title: song.title,
    artistName: song.artist.name,
    artistSlug: song.artist.slug,
    coverUrl: song.coverUrl,
    isVault: song.isVault,
    memberReleaseAt: song.memberReleaseAt?.toISOString() ?? null,
    publicReleaseAt: song.publicReleaseAt?.toISOString() ?? null,
    userTier: tier,
    isDropped,
  });

  return (
    <AppShell eyebrow="Drops" title="Upcoming Drops">
      {/* Hero strip */}
      <div className="mb-8 overflow-hidden rounded-[2rem] border border-white/8 bg-[linear-gradient(135deg,#0c1328_0%,#150a2a_55%,#050816_100%)] px-6 py-8 text-center">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/4 top-0 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-[80px]" />
          <div className="absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-violet-500/10 blur-[80px]" />
        </div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-fuchsia-300/80">
          Exclusive releases
        </p>
        <h2 className="text-xl font-bold text-white">VAULT members hear it first.</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
          Scheduled drops from FlowSoundz artists. VAULT members get early access before anyone else.
        </p>
        {tier === "FREE" && (
          <Link
            href="/membership"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#a855f7_0%,#ec4899_100%)] px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_18px_rgba(168,85,247,0.35)] transition hover:shadow-[0_0_28px_rgba(168,85,247,0.5)]"
          >
            Join Vault — $14.99/mo
          </Link>
        )}
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Upcoming · {upcoming.length}
            </h2>
            {tier === "VAULT" && (
              <span className="rounded-full border border-fuchsia-400/25 bg-fuchsia-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-fuchsia-300">
                ⚡ You have early access
              </span>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((song) => (
              <DropCard key={song.id} {...toCardProps(song, false)} />
            ))}
          </div>
        </section>
      )}

      {/* Recently dropped */}
      {recentlyDropped.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Just Dropped · last 14 days
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {recentlyDropped.map((song) => (
              <DropCard key={song.id} {...toCardProps(song, true)} />
            ))}
          </div>
        </section>
      )}

      {upcoming.length === 0 && recentlyDropped.length === 0 && (
        <div className="rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 p-12 text-center">
          <p className="mb-2 text-2xl">📅</p>
          <p className="mb-1 text-sm font-semibold text-white">No drops scheduled yet</p>
          <p className="mb-6 text-xs text-slate-500">Artists will post upcoming drops here. Check back soon.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/radio" className="rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/5">
              Tune In Now
            </Link>
            <Link href="/songs" className="rounded-full border border-white/10 px-5 py-2 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:text-white">
              Browse All Songs
            </Link>
          </div>
        </div>
      )}

      {/* Artist CTA */}
      <div className="mt-4 rounded-[1.6rem] border border-white/8 bg-white/[0.02] p-5 text-center">
        <p className="text-xs text-slate-500">
          Are you an artist?{" "}
          <Link href="/artist/drops" className="text-fuchsia-400 underline hover:text-fuchsia-300">
            Schedule your own drop →
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
