import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { sendPromoLeadNotification } from "@/lib/mailer";
import { appendPromoPayment, type PromoPaymentTier } from "@/lib/promoPaymentStore";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!secretKey) {
    return Response.json({ error: "Misconfigured." }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  const stripe = new Stripe(secretKey);

  let event: Stripe.Event;
  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // Dev fallback without signature verification
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err) {
    console.error("[promo/webhook] signature verification failed", err);
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Priority-review payment for an artist submission — mark it paid.
    if (session.metadata?.type === "submission_review" && session.metadata?.submission_id) {
      void prisma.artistSubmission
        .update({
          where: { id: session.metadata.submission_id },
          data: { reviewPaidAt: new Date() },
        })
        .catch(() => undefined);
      return Response.json({ received: true });
    }

    const artistName = session.metadata?.artist_name ?? "Unknown";
    const songTitle = session.metadata?.song_title ?? "";
    const tier = session.metadata?.package_tier ?? "basic";
    const email = session.customer_details?.email ?? "";
    const amount = session.amount_total ?? 0;

    const now = new Date().toISOString();
    void appendPromoPayment({
      id: `promo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
      tier: (["basic", "featured", "sponsored"].includes(tier) ? tier : "basic") as PromoPaymentTier,
      artistName,
      songTitle,
      email,
      amountCents: amount,
      stripeSessionId: session.id,
      status: "pending_review",
      internalNotes: null,
    }).catch(() => undefined);

    void sendPromoLeadNotification({
      artistName,
      trackLink: songTitle ? `Song: ${songTitle}` : "(not provided)",
      budgetRange: `$${(amount / 100).toFixed(2)} — ${tier} tier (paid)`,
      email,
      submittedAt: now,
    }).catch(() => undefined);
  }

  return Response.json({ received: true });
}
