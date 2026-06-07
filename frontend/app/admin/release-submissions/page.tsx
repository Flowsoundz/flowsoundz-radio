import { AppShell } from "@/components/AppShell";
import {
  AdminReleaseSubmissionsReview,
  type ReleaseSubmission,
} from "@/components/AdminReleaseSubmissionsReview";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function loadSubmissions(): Promise<ReleaseSubmission[]> {
  try {
    const rows = await prisma.releaseSubmission.findMany({
      orderBy: { createdAt: "desc" },
    });
    return rows.map((s) => ({
      submission_id: s.id,
      artist_name: s.artistName,
      track_title: s.trackTitle,
      genre: s.genre,
      release_date: s.releaseDate,
      email: s.email,
      notes: s.notes,
      audio_file: s.audioFile ?? undefined,
      cover_file: s.coverFile ?? undefined,
      status: s.status.toLowerCase(),
      internal_notes: s.internalNotes,
      ai_summary: s.aiSummary,
      ai_tags: s.aiTags,
      ai_recommendation: s.aiRecommendation,
      ai_confidence: s.aiConfidence,
      ai_generated_at: s.aiGeneratedAt?.toISOString() ?? null,
      ai_model: s.aiModel,
      created_at: s.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export default async function AdminReleaseSubmissionsPage() {
  const submissions = await loadSubmissions();
  const pendingCount = submissions.filter((s) =>
    ["received", "reviewed"].includes(s.status),
  ).length;

  return (
    <AppShell
      eyebrow="Admin"
      title="Release Submission Inbox"
      subtitle={
        submissions.length === 0
          ? "No release submissions yet — they will appear here when artists submit via the intake form."
          : pendingCount > 0
          ? `${submissions.length} submission${submissions.length === 1 ? "" : "s"} · ${pendingCount} awaiting decision.`
          : `${submissions.length} submission${submissions.length === 1 ? "" : "s"} · all reviewed.`
      }
    >
      <AdminReleaseSubmissionsReview submissions={submissions} />
    </AppShell>
  );
}
