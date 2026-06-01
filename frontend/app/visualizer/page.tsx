import { AppShell } from "@/components/AppShell";
import { ConnectedVisualizerStudio } from "@/components/visualizer/ConnectedVisualizerStudio";

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
      eyebrow="FlowSoundz Visualizer Studio"
      title="Connected visualizer studio for radio mode previews"
      subtitle="Upload a local track, set the artist name, and preview the same Aurora Field or Liquid Mercury visualizer modes used by the radio modal. Everything runs in the browser with no backend, auth, or external services."
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
