import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { ConnectedVisualizerStudio } from "@/components/visualizer/ConnectedVisualizerStudio";

export const metadata: Metadata = {
  title: "Visualizer Studio — FlowSoundz Radio",
  description:
    "Preview your track through the FlowSoundz Radio visualizer. Upload locally, choose a visual mode, and export a promo loop for TikTok, Reels, or Shorts.",
};

export default async function VisualizerStudioPage(
  props: PageProps<"/visualizer">,
) {
  const searchParams = await props.searchParams;
  const initialArtistName =
    typeof searchParams.artist === "string" ? searchParams.artist : undefined;
  const initialTrackTitle =
    typeof searchParams.track === "string" ? searchParams.track : undefined;
  const initialPersonaLabel =
    typeof searchParams.persona === "string" ? searchParams.persona : undefined;
  const initialExportTarget =
    typeof searchParams.target === "string" ? searchParams.target : undefined;

  return (
    <AppShell
      eyebrow="Visualizer Studio"
      title="See your track the way listeners do."
      subtitle="Preview your song through the FlowSoundz Radio visual engine. Upload locally, pick a mode, and export a promo loop — no account, no backend, runs entirely in your browser."
    >
      <ConnectedVisualizerStudio
        initialArtistName={initialArtistName}
        initialTrackTitle={initialTrackTitle}
        initialPersonaLabel={initialPersonaLabel}
        initialExportTarget={initialExportTarget}
      />
    </AppShell>
  );
}
