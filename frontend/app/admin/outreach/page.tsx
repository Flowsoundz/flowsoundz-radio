import { AppShell } from "@/components/AppShell";
import { AdminOutreachAgent } from "@/components/AdminOutreachAgent";
import { AdminSocialCampaignAgent } from "@/components/AdminSocialCampaignAgent";

export default function AdminOutreachPage() {
  return (
    <AppShell
      eyebrow="Admin"
      title="Artist Outreach"
      subtitle="Generate social campaign packages, trackable links, and short outreach DM copy for the FlowSoundz discovery lane."
    >
      <div className="space-y-6">
        <AdminSocialCampaignAgent />
        <AdminOutreachAgent />
      </div>
    </AppShell>
  );
}
