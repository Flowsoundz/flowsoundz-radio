import { AppShell } from "@/components/AppShell";
import { AdminArtistSubmissionsReview } from "@/components/AdminArtistSubmissionsReview";
import {
  readArtistSubmissions,
  type ArtistSubmissionRecord,
} from "@/lib/artistSubmissionStore";

export const dynamic = "force-dynamic";

export default async function AdminArtistSubmissionsPage() {
  const isConfigured = Boolean(process.env.ADMIN_UPLOAD_PASSWORD);
  let submissions: ArtistSubmissionRecord[] = [];
  let storageError: string | null = null;

  if (isConfigured) {
    try {
      submissions = await readArtistSubmissions();
    } catch (error) {
      storageError =
        error instanceof Error
          ? error.message
          : "Failed to load artist submissions.";
    }
  }
  const pendingCount = submissions.filter((submission) =>
    ["new", "reviewing"].includes(submission.status),
  ).length;

  return (
    <AppShell
      eyebrow="Admin"
      title="Artist Submission Inbox"
      subtitle={
        !isConfigured
          ? "Review Creator Hub submissions after configuring the admin password."
          : submissions.length === 0
            ? "No Creator Hub submissions yet — they will appear here after artists submit through /artist/submit."
            : pendingCount > 0
              ? `${submissions.length} submission${submissions.length === 1 ? "" : "s"} · ${pendingCount} awaiting review.`
              : `${submissions.length} submission${submissions.length === 1 ? "" : "s"} · all reviewed.`
      }
    >
      {isConfigured ? (
        storageError ? (
          <div className="glass-card rounded-[1.8rem] p-6 text-sm leading-6 text-rose-100">
            {storageError}
          </div>
        ) : (
          <AdminArtistSubmissionsReview submissions={submissions} />
        )
      ) : (
        <div className="glass-card rounded-[1.8rem] p-6 text-sm leading-6 text-rose-100">
          Set `ADMIN_UPLOAD_PASSWORD` in `.env.local` to enable this admin
          tool.
        </div>
      )}
    </AppShell>
  );
}
