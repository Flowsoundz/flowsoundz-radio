import { NextResponse } from "next/server";
import {
  readArtistSubmissions,
  updateArtistSubmissionReview,
  type ArtistSubmissionStatus,
} from "@/lib/artistSubmissionStore";
import {
  sendArtistApprovalEmail,
  sendArtistRejectionEmail,
} from "@/lib/mailer";
import { publishApprovedSubmission } from "@/lib/publishSubmission";

export const runtime = "nodejs";

const STATUS_OPTIONS = new Set<ArtistSubmissionStatus>([
  "new",
  "reviewing",
  "approved",
  "rejected",
]);

export async function GET() {
  try {
    const submissions = await readArtistSubmissions();
    return NextResponse.json({ submissions });
  } catch {
    return NextResponse.json(
      { error: "Failed to load artist submissions." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const submissionId = String(formData.get("submissionId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as ArtistSubmissionStatus;
  const internalNotesRaw = String(formData.get("internalNotes") ?? "").trim();
  const internalNotes = internalNotesRaw || null;
  const artistFeedbackRaw = String(formData.get("artistFeedback") ?? "").trim();
  const artistFeedback = artistFeedbackRaw || null;
  // Optional: admin pastes the direct CDN audio URL when the submitted link
  // was a share page (the resolvableAudio warning).
  const overrideAudioUrlRaw = String(formData.get("overrideAudioUrl") ?? "").trim();
  const overrideAudioUrl = overrideAudioUrlRaw || undefined;

  if (!process.env.ADMIN_UPLOAD_PASSWORD) {
    return NextResponse.json(
      { error: "ADMIN_UPLOAD_PASSWORD is not configured." },
      { status: 500 },
    );
  }

  if (password !== process.env.ADMIN_UPLOAD_PASSWORD) {
    return NextResponse.json({ error: "Invalid admin password." }, { status: 401 });
  }

  if (!submissionId) {
    return NextResponse.json({ error: "Submission ID is required." }, { status: 422 });
  }

  if (!STATUS_OPTIONS.has(status)) {
    return NextResponse.json({ error: "Invalid review status." }, { status: 422 });
  }

  try {
    const submission = await updateArtistSubmissionReview({
      submissionId,
      status,
      internalNotes,
      artistFeedback,
    });

    if (status === "approved") {
      // Approval is the gate that puts a track on air: run the requirements
      // engine and, if it clears, hand the song to the mastering worker.
      const published = await publishApprovedSubmission(submissionId, overrideAudioUrl);
      if (!published.ok && published.reason === "blocked") {
        return NextResponse.json(
          {
            error: "Submission does not meet requirements — cannot publish.",
            blockingReasons: published.verdict.blockingReasons,
            checks: published.verdict.checks,
          },
          { status: 422 },
        );
      }

      void sendArtistApprovalEmail({
        contactName: submission.contact_name,
        email: submission.email,
        artistName: submission.artist_name,
        songTitle: submission.song_title,
      });

      return NextResponse.json({
        ok: true,
        submission,
        published: published.ok
          ? { songId: published.songId, alreadyPublished: published.alreadyPublished }
          : null,
      });
    } else if (status === "rejected") {
      void sendArtistRejectionEmail({
        contactName: submission.contact_name,
        email: submission.email,
        artistName: submission.artist_name,
        songTitle: submission.song_title,
      });
    }

    return NextResponse.json({ ok: true, submission });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to save review.",
      },
      { status: 500 },
    );
  }
}
