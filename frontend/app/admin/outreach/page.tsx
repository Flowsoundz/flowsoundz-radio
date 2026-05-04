import { AppShell } from "@/components/AppShell";
import { AdminOutreachAgent } from "@/components/AdminOutreachAgent";

export default function AdminOutreachPage() {
  return (
    <AppShell
      eyebrow="Admin"
      title="Artist Outreach"
      subtitle="Generate short outreach DM copy for artists who fit the FlowSoundz discovery lane."
    >
      <AdminOutreachAgent />
    </AppShell>
  );
}
