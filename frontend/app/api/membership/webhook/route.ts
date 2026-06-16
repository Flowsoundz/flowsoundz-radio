import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { handleStripeEvent } from "@/lib/stripeWebhook";

export const runtime = "nodejs";

// Thin wrapper — all event logic lives in lib/stripeWebhook so this route and
// /api/promo/webhook behave identically. Whichever URL is registered in Stripe
// handles every payment type (membership, submission_review, promo).
export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    return NextResponse.json({ received: true });
  }

  const stripe = new Stripe(secretKey);
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const body = await req.text();

  let event: Stripe.Event;
  try {
    if (!webhookSecret || !sig) {
      console.error("[membership/webhook] missing STRIPE_WEBHOOK_SECRET or stripe-signature header");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
    }
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[membership/webhook] signature error", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await handleStripeEvent(stripe, event);
  } catch (err) {
    console.error("[membership/webhook] handler error", err);
  }
  return NextResponse.json({ received: true });
}
