import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { DropScheduler } from "@/components/DropScheduler";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Schedule Drops — FlowSoundz Radio",
};

export default async function ArtistDropsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin?next=/artist/drops");

  const artist = await prisma.artist.findFirst({
    where: { email: session.user.email },
    include: {
      songs: {
        select: {
          id: true,
          title: true,
          coverUrl: true,
          isVault: true,
          memberReleaseAt: true,
          publicReleaseAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!artist) {
    return (
      <AppShell eyebrow="Creator Hub" title="Schedule Drops">
        <div className="mb-8">
          <Link href="/artist/dashboard" className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 transition hover:border-white/20 hover:text-white">
            ← Creator Hub
          </Link>
        </div>
        <div className="rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 p-12 text-center">
          <p className="mb-1 text-sm font-semibold text-white">No artist profile linked</p>
          <p className="mb-6 text-xs text-slate-500">Submit your first track to unlock drop scheduling.</p>
          <Link href="/artist/submit" className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_18px_rgba(0,229,255,0.3)] transition hover:shadow-[0_0_28px_rgba(0,229,255,0.5)]">
            Submit a Track
          </Link>
        </div>
      </AppShell>
    );
  }

  const songs = artist.songs.map((s) => ({
    id: s.id,
    title: s.title,
    coverUrl: s.coverUrl,
    isVault: s.isVault,
    memberReleaseAt: s.memberReleaseAt?.toISOString() ?? null,
    publicReleaseAt: s.publicReleaseAt?.toISOString() ?? null,
  }));

  return (
    <AppShell eyebrow="Creator Hub" title="Schedule Drops">
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Link href="/artist/dashboard" className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 transition hover:border-white/20 hover:text-white">
          ← Creator Hub
        </Link>
        <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/[0.07] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-fuchsia-300">
          {artist.name}
        </span>
        <Link href="/drops" className="ml-auto rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 transition hover:border-white/20 hover:text-white">
          View Public Drops →
        </Link>
      </div>

      {/* Explainer */}
      <div className="mb-6 rounded-[1.6rem] border border-amber-400/15 bg-amber-400/[0.05] p-5">
        <p className="text-xs font-semibold text-amber-200 mb-1">How drop scheduling works</p>
        <p className="text-xs text-slate-400 leading-5">
          Set a <span className="text-fuchsia-300 font-semibold">Vault Early Access</span> date so VAULT members hear your track first.
          Set a <span className="text-cyan-300 font-semibold">Public Release</span> date for when everyone gets access.
          Use the <span className="text-fuchsia-300 font-semibold">⚡ 72h Vault Window</span> button to set a standard exclusive window automatically.
          Your drops appear on the <Link href="/drops" className="underline hover:text-white">public drops page</Link> once scheduled.
        </p>
      </div>

      <DropScheduler songs={songs} />
    </AppShell>
  );
}
