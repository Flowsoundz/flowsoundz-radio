import { NextResponse } from "next/server";
import { updateArtistSubmissionPromo } from "@/lib/artistSubmissionStore";
import type { ArtistPromoOutput } from "@/lib/creatorHub/generators";

export const runtime = "nodejs";

type PreviewRequest = {
  submissionId?: unknown;
  promo?: unknown;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export async function POST(request: Request) {
  let body: PreviewRequest;

  try {
    body = (await request.json()) as PreviewRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const submissionId =
    typeof body.submissionId === "string" ? body.submissionId.trim() : "";
  const promoRaw =
    typeof body.promo === "object" && body.promo !== null
      ? (body.promo as Record<string, unknown>)
      : null;

  if (!submissionId) {
    return NextResponse.json({ error: "Submission ID is required." }, { status: 422 });
  }

  if (!promoRaw) {
    return NextResponse.json({ error: "Promo payload is required." }, { status: 422 });
  }

  const promo: ArtistPromoOutput = {
    bio: typeof promoRaw.bio === "string" ? promoRaw.bio.trim() : "",
    suggestedVibe:
      typeof promoRaw.suggestedVibe === "string"
        ? promoRaw.suggestedVibe.trim()
        : "Chill",
    promoBlurb:
      typeof promoRaw.promoBlurb === "string" ? promoRaw.promoBlurb.trim() : "",
    radioIntro:
      typeof promoRaw.radioIntro === "string" ? promoRaw.radioIntro.trim() : "",
    socialCaptions: isStringArray(promoRaw.socialCaptions)
      ? promoRaw.socialCaptions
          .map((caption) => caption.trim())
          .filter(Boolean)
          .slice(0, 3)
      : [],
  };

  if (!promo.bio || !promo.promoBlurb || !promo.radioIntro) {
    return NextResponse.json(
      { error: "Bio, promo blurb, and station intro are required." },
      { status: 422 },
    );
  }

  try {
    const submission = await updateArtistSubmissionPromo({
      submissionId,
      promo,
    });
    return NextResponse.json({ ok: true, submission });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update submission preview.",
      },
      { status: 500 },
    );
  }
}
