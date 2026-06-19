import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCreatorDashboard } from "@/lib/creatorDashboard";
import { readArtistSubmissionsByEmail } from "@/lib/artistSubmissionStore";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const [submissions, dashboard] = await Promise.all([
      readArtistSubmissionsByEmail(session.user.email),
      getCreatorDashboard(session.user.email),
    ]);
    const trackMap = new Map(
      (dashboard?.tracks ?? []).map((track) => [track.submissionId, track]),
    );

    const enriched = submissions.map((submission) => {
      const track = trackMap.get(submission.submission_id);
      return {
        ...submission,
        review_paid: Boolean(track?.reviewPaid),
        song_id: track?.songId ?? null,
        plays: track?.plays ?? 0,
        fires: track?.fires ?? 0,
        favorites: track?.favorites ?? 0,
        requests: track?.requests ?? 0,
        rotation_score: track?.rotationScore ?? 0,
        next_airing: track?.nextAiring ?? null,
      };
    });

    return NextResponse.json({ submissions: enriched });
  } catch {
    return NextResponse.json(
      { error: "Failed to load submissions." },
      { status: 500 },
    );
  }
}
