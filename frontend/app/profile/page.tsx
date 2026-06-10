import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "My Profile — FlowSoundz Radio",
};

export const dynamic = "force-dynamic";

const VIBE_COLOR: Record<string, string> = {
  CHILL: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
  HYPE: "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-200",
  LATE_NIGHT: "border-violet-400/25 bg-violet-400/10 text-violet-200",
  EMOTIONAL: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  UNSURE: "border-slate-400/25 bg-slate-400/10 text-slate-300",
};

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin?next=/profile");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      favorites: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          song: {
            include: { artist: { select: { name: true, slug: true } } },
          },
        },
      },
    },
  }).catch(() => null);

  if (!user) redirect("/signin?next=/profile");

  const tier = user.tier;
  const tierColor =
    tier === "VAULT"
      ? "border-amber-400/25 bg-amber-400/10 text-amber-200"
      : tier === "INSIDER"
        ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-200"
        : "border-slate-400/25 bg-slate-400/10 text-slate-300";

  return (
    <AppShell eyebrow="FlowSoundz" title="My Profile">
      {/* Identity card */}
      <section className="mb-6 flex items-center gap-4 rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 p-6">
        {session.user.image ? (
          <img
            src={session.user.image}
            alt={session.user.name ?? ""}
            className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-white/10"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/8 text-2xl">
            🎧
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-white truncate">
            {session.user.name ?? session.user.email}
          </p>
          <p className="text-sm text-slate-400 truncate">{session.user.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${tierColor}`}>
              {tier.charAt(0) + tier.slice(1).toLowerCase()}
            </span>
            <span className="rounded-full border border-slate-400/20 bg-slate-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-300">
              Listener since {formatDate(user.createdAt)}
            </span>
          </div>
        </div>
      </section>

      {/* Saved songs */}
      <section className="rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05]">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Saved Songs ({user.favorites.length})
          </h2>
          <Link
            href="/radio"
            className="text-xs text-cyan-400 hover:text-cyan-300 transition"
          >
            Listen →
          </Link>
        </div>

        {user.favorites.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-slate-500">No saved songs yet.</p>
            <p className="mt-2 text-xs text-slate-600">
              Tap the ♡ button while listening to save a track here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {user.favorites.map((fav) => {
              const vibeKey = fav.song.vibe.toUpperCase().replace(" ", "_");
              return (
                <div key={fav.id} className="flex items-center gap-3 px-6 py-3.5">
                  <span className="text-rose-400 text-sm">♥</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {fav.song.title}
                    </p>
                    <Link
                      href={`/artists/${fav.song.artist.slug}`}
                      className="text-xs text-slate-400 hover:text-slate-200 transition"
                    >
                      {fav.song.artist.name}
                    </Link>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${VIBE_COLOR[vibeKey] ?? VIBE_COLOR.UNSURE}`}
                  >
                    {fav.song.vibe.toLowerCase().replace("_", " ")}
                  </span>
                  <span className="shrink-0 text-[10px] text-slate-600">
                    {formatDate(fav.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Quick actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/radio"
          className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_14px_rgba(0,229,255,0.2)] transition hover:shadow-[0_0_24px_rgba(0,229,255,0.35)]"
        >
          🎧 Listen Now
        </Link>
        <Link
          href="/artist/submit"
          className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
        >
          Submit a track
        </Link>
      </div>
    </AppShell>
  );
}
