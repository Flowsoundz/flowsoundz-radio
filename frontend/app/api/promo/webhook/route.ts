import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { handleStripeEvent } from "@/lib/stripeWebhook";

export const runtime = "nodejs";

// Thin wrapper — all event logic lives in lib/stripeWebhook so this route and
// /api/membership/webhook behave identically. Whichever URL is registered in
// Stripe handles every payment type (submission_review, membership, promo).
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
      event = JSON.parse(body) as Stripe.Event; // dev fallback without verification
    }
  } catch (err) {
    console.error("[promo/webhook] signature verification failed", err);
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    await handleStripeEvent(stripe, event);
  } catch (err) {
    console.error("[promo/webhook] handler error", err);
  }
  return Response.json({ received: true });
}
