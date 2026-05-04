import { AppShell } from "@/components/AppShell";
import { AdminContentEditor } from "@/components/AdminContentEditor";
import { getHomepageContent } from "@/lib/homepage-content";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const isConfigured = Boolean(process.env.ADMIN_UPLOAD_PASSWORD);
  const content = isConfigured ? await getHomepageContent() : null;

  return (
    <AppShell
      eyebrow="Admin"
      title="Homepage Content"
      subtitle="Edit homepage marketing copy, CTA buttons, value cards, and brand settings. Changes are saved to content/homepage.json and reflected immediately."
    >
      {isConfigured ? (
        <AdminContentEditor initial={content!} />
      ) : (
        <div className="glass-card rounded-[1.8rem] p-6 text-sm leading-6 text-rose-100">
          Set <code>ADMIN_UPLOAD_PASSWORD</code> in <code>.env.local</code> to
          enable this tool.
        </div>
      )}
    </AppShell>
  );
}
