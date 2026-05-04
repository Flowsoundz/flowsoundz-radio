import { AppShell } from "@/components/AppShell";
import { PromoPreviewClient } from "@/components/PromoPreviewClient";

export default function PromoPreviewPage() {
  return (
    <AppShell
      eyebrow="Promo"
      title="Preview AI onboarding"
      subtitle="Review the generated artist bio, vibe tag, and radio blurb before finalizing the FlowSoundz submission."
    >
      <PromoPreviewClient />
    </AppShell>
  );
}
