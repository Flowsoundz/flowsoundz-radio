import { AppShell } from "@/components/AppShell";
import { AdminAiHostPilot } from "@/components/AdminAiHostPilot";

export const dynamic = "force-dynamic";

export default function AdminAiHostPage() {
  return (
    <AppShell
      eyebrow="Admin / AI Host"
      title="AI Host Pilot"
      subtitle="Preview station IDs, track intros, artist spotlights, and crowd-energy segments before scheduling them on air."
    >
      <AdminAiHostPilot />
    </AppShell>
  );
}
