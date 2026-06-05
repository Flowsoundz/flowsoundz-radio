import type { NextRequest } from "next/server";
import { sendPromoLeadNotification } from "@/lib/mailer";

export const runtime = "nodejs";

type LeadBody = {
  artist_name?: unknown;
  track_link?: unknown;
  budget_range?: unknown;
  email?: unknown;
  rights_confirmed?: unknown;
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(request: NextRequest) {
  let body: LeadBody;
  try {
    body = (await request.json()) as LeadBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const artistName = str(body.artist_name);
  const trackLink = str(body.track_link);
  const budgetRange = str(body.budget_range);
  const email = str(body.email);
  const rightsConfirmed = Boolean(body.rights_confirmed);

  if (!artistName || !email) {
    return Response.json(
      { error: "artist_name and email are required." },
      { status: 422 },
    );
  }

  if (!rightsConfirmed) {
    return Response.json(
      { error: "Rights confirmation is required." },
      { status: 422 },
    );
  }

  void sendPromoLeadNotification({
    artistName,
    trackLink,
    budgetRange,
    email,
    submittedAt: new Date().toISOString(),
  }).catch(() => undefined);

  return Response.json({
    message:
      "Received. The FlowSoundz team will review your request and get back to you.",
  });
}
