import { AppShell } from "@/components/AppShell";
import {
  AdminReleaseSubmissionsReview,
  type ReleaseSubmission,
} from "@/components/AdminReleaseSubmissionsReview";

export const dynamic = "force-dynamic";
async function loadSubmissions(): Promise<ReleaseSubmission[]> {
  return [];
}

export default async function AdminReleaseSubmissionsPage() {
  const isConfigured = Boolean(process.env.ADMIN_UPLOAD_PASSWORD);
  const submissions = isConfigured ? await loadSubmissions() : [];
  const isStorageConfigured = false;

  const pendingCount = submissions.filter((submission) =>
    ["received", "reviewed"].includes(submission.status),
  ).length;

  return (
    <AppShell
      eyebrow="Admin"
      title="Release Submission Inbox"
      subtitle={
        !isConfigured
          ? "Review homepage release submissions after configuring the admin password."
          : submissions.length === 0
            ? "No homepage release submissions yet — they will appear here after artists use the Submit your release modal."
            : pendingCount > 0
              ? `${submissions.length} submission${submissions.length === 1 ? "" : "s"} · ${pendingCount} awaiting decision.`
              : `${submissions.length} submission${submissions.length === 1 ? "" : "s"} · all reviewed.`
      }
    >
      {isConfigured && isStorageConfigured ? (
        <AdminReleaseSubmissionsReview submissions={submissions} />
      ) : isConfigured ? (
        <div className="glass-card rounded-[1.8rem] p-6 text-sm leading-6 text-amber-100">
          Release submission inbox storage is not configured for this deployment
          yet. This screen should stay hidden until a dedicated database-backed
          store is added.
        </div>
      ) : (
        <div className="glass-card rounded-[1.8rem] p-6 text-sm leading-6 text-rose-100">
          Set `ADMIN_UPLOAD_PASSWORD` in `.env.local` to enable this admin
          tool.
        </div>
      )}
    </AppShell>
  );
}
