import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CoverArt } from "@/components/CoverArt";
import { formatVibeLabel } from "@/lib/format";
import { readCatalogSnapshotFromStore } from "@/lib/catalogSnapshotStore";

export const metadata: Metadata = {
  title: "Artists — FlowSoundz Radio",
  description:
    "Discover independent artists in the FlowSoundz Radio rotation. Every profile is a live snapshot — tracks, vibes, and rotation status straight from the station.",
};

export const dynamic = "force-dynamic";

const VIBE_TABS = [
  { label: "All", value: "all" },
  { label: "Chill", value: "chill" },
  { label: "Hype", value: "hype" },
  { label: "Late Night", value: "late_night" },
  { label: "Emotional", value: "emotional" },
];

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ArtistsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const vibeFilter = typeof params.vibe === "string" ? params.vibe : "all";
  const snapshot = await readCatalogSnapshotFromStore();
  const allArtists = snapshot.artists;
  const artists =
    vibeFilter === "all"
      ? allArtists
      : allArtists.filter((a) => a.vibes.includes(vibeFilter));
  const isFallbackCatalog = snapshot.isFallbackCatalog;
  void isFallbackCatalog;

  return (
    <AppShell
      eyebrow="Artists"
      title="Artist Profiles"
      subtitle={`${artists.length} artist${artists.length === 1 ? "" : "s"} in FlowSoundz rotation.`}
    >
      <div className="mb-6 rounded-[1.9rem] border border-white/10 bg-[linear-gradient(135deg,rgba(0,229,255,0.07),rgba(124,77,255,0.07),rgba(255,61,242,0.05))] p-5">
        <p className="text-sm leading-6 text-slate-300">
          Every profile is a live snapshot from the FlowSoundz catalog — tracks, cover art, vibes, and rotation status, directly from the station. Discover an artist here before the algorithm knows they exist.
        </p>
      </div>

      {/* ── Vibe filter ── */}
      <div className="mb-6 flex gap-2 overflow-x-auto scrollbar-none">
        {VIBE_TABS.map((tab) => {
          const isActive = vibeFilter === tab.value;
          return (
            <Link
              key={tab.value}
              href={tab.value === "all" ? "/artists" : `/artists?vibe=${tab.value}`}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? "bg-[linear-gradient(135deg,#00e5ff,#7c4dff)] text-white shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                  : "border border-white/10 text-white/50 hover:border-white/20 hover:text-white/80"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
        <span className="ml-auto shrink-0 self-center text-xs text-white/25">
          {artists.length} artist{artists.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {artists.map((artist) => (
          <Link
            key={artist.slug}
            href={`/artists/${artist.slug}`}
            className="glass-card group overflow-hidden rounded-[1.8rem] transition-transform duration-200 hover:-translate-y-1"
          >
            <div className="relative aspect-[1.2/1] bg-gradient-to-br from-cyan-400/20 to-fuchsia-500/20">
              <CoverArt
                src={artist.heroImage}
                alt={`${artist.name} artwork`}
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgba(5,8,22,0.88)_100%)]" />
              <div className="absolute inset-x-5 bottom-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/80">
                  FlowSoundz Artist
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{artist.name}</h2>
              </div>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex flex-wrap gap-2">
                {artist.vibes.slice(0, 3).map((vibe) => (
                  <span
                    key={vibe}
                    className="rounded-full bg-cyan-300/12 px-3 py-1 text-xs font-medium text-cyan-100"
                  >
                    {formatVibeLabel(vibe)}
                  </span>
                ))}
              </div>
              <p className="text-sm leading-6 text-slate-300">{artist.bio}</p>
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>{artist.songCount} track{artist.songCount === 1 ? "" : "s"}</span>
                <span>{artist.genres[0] ?? "Independent"}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
