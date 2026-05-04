import { AppShell } from "@/components/AppShell";
import {
  AdminReleaseSubmissionsReview,
  type ReleaseSubmission,
} from "@/components/AdminReleaseSubmissionsReview";

export const dynamic = "force-dynamic";
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

async function loadSubmissions(): Promise<ReleaseSubmission[]> {
  try {
    const response = await fetch(`${API_BASE}/admin/release-submissions`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as {
      submissions?: ReleaseSubmission[];
    };
    return data.submissions ?? [];
  } catch {
    return [];
  }
}

export default async function AdminReleaseSubmissionsPage() {
  const isConfigured = Boolean(process.env.ADMIN_UPLOAD_PASSWORD);
  const submissions = isConfigured ? await loadSubmissions() : [];

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
      {isConfigured ? (
        <AdminReleaseSubmissionsReview submissions={submissions} />
      ) : (
        <div className="glass-card rounded-[1.8rem] p-6 text-sm leading-6 text-rose-100">
          Set `ADMIN_UPLOAD_PASSWORD` in `.env.local` to enable this admin
          tool.
        </div>
      )}
    </AppShell>
  );
}
