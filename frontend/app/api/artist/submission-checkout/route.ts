import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One-time fee for PRIORITY REVIEW — guaranteed human feedback within 48h and a
// front-of-the-line review slot. This buys *consideration*, never guaranteed
// airplay or queue placement (that would be payola and would poison the
// curation the whole brand rests on). Free submissions remain fully open.
const PRIORITY_REVIEW_CENTS = 500; // $5.00

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(request: NextRequest) {
  let body: { submission_id?: unknown; origin?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }
  const submissionId = str(body.submission_id);
  if (!submissionId) return Response.json({ error: "submission_id required" }, { status: 400 });

  const submission = await prisma.artistSubmission.findUnique({
    where: { id: submissionId },
    select: { id: true, songTitle: true, artistName: true, reviewPaidAt: true },
  });
  if (!submission) return Response.json({ error: "Submission not found." }, { status: 404 });
  if (submission.reviewPaidAt) {
    return Response.json({ error: "Priority review already purchased." }, { status: 409 });
  }

  const origin = str(body.origin) || request.headers.get("origin") || "https://www.flowsoundzradio.com";
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  // Dev bypass when Stripe isn't configured — mark paid and bounce to success.
  // NEVER in production: a missing key must fail loudly, not hand out free
  // priority reviews.
  if (!secretKey) {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
      return Response.json(
        { error: "Payments are temporarily unavailable. Please try again shortly." },
        { status: 503 },
      );
    }
    await prisma.artistSubmission.update({
      where: { id: submissionId },
      data: { reviewPaidAt: new Date() },
    });
    return Response.json({ url: `${origin}/artist/confirmation?priority=1&mock=1` });
  }

  const stripe = new Stripe(secretKey);
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "FlowSoundz Radio — Priority Review",
            description: `Guaranteed feedback within 48h for "${submission.songTitle}". Reviews consideration only — not guaranteed airplay.`,
          },
          unit_amount: PRIORITY_REVIEW_CENTS,
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/artist/confirmation?priority=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/artist/confirmation?cancelled=1`,
    metadata: {
      type: "submission_review",
      submission_id: submission.id,
      artist_name: submission.artistName,
      song_title: submission.songTitle,
    },
  });

  return Response.json({ url: session.url });
}
