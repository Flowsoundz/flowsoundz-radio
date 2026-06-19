import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { RadioOverview } from "@/components/radio/RadioOverview";
import { getStaticCatalog } from "@/lib/staticCatalog";
import { getSiteUrl } from "@/lib/siteUrl";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const songId = typeof params.song === "string" ? params.song : null;

  const base = getSiteUrl();

  if (songId) {
    const catalog = getStaticCatalog();
    const song = catalog.find((s) => s.id === songId);
    if (song) {
      const ogUrl = `${base}/api/og/track?id=${songId}`;
      return {
        title: `${song.title} — FlowSoundz Radio`,
        description: `Listening to "${song.title}" by ${song.artist} on FlowSoundz Radio — live underground music streaming 24/7.`,
        openGraph: {
          title: `${song.title} · ${song.artist}`,
          description: "Playing now on FlowSoundz Radio",
          images: [{ url: ogUrl, width: 1200, height: 630 }],
          url: `${base}/radio?song=${songId}`,
        },
        twitter: {
          card: "summary_large_image",
          title: `${song.title} · ${song.artist}`,
          description: "Playing now on FlowSoundz Radio",
          images: [ogUrl],
        },
      };
    }
  }

  const ogUrl = `${base}/api/og/track`;
  return {
    title: "Live Radio — FlowSoundz Radio",
    description:
      "Tune in to FlowSoundz Radio — curated underground music streaming 24/7. Hip-hop, R&B, soul, Afrobeats, and more.",
    openGraph: {
      title: "FlowSoundz Radio — Live Stream",
      description: "Curated underground music, streaming now.",
      images: [{ url: ogUrl, width: 1200, height: 630 }],
      url: `${base}/radio`,
    },
    twitter: {
      card: "summary_large_image",
      title: "FlowSoundz Radio — Live Stream",
      description: "Curated underground music, streaming now.",
      images: [ogUrl],
    },
  };
}

export default function RadioPage() {
  return (
    <AppShell
      eyebrow="Live Radio"
      title="Shared-time radio for listeners who want discovery to feel live."
      subtitle="The player stays with you across the site. This page turns the station into a destination with context, schedule, and what is happening right now."
    >
      <RadioOverview />
    </AppShell>
  );
}
