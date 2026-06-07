import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const TIER_MAP: Record<string, "INSIDER" | "VAULT"> = {
  insider: "INSIDER",
  vault: "VAULT",
};

async function getCustomerEmail(stripe: import("stripe").Stripe, customerId: string): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return null;
    return (customer as import("stripe").Stripe.Customer).email ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ received: true });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const body = await req.text();

  let event: import("stripe").Stripe.Event;
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
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as import("stripe").Stripe.Checkout.Session;
      const tier = (session.metadata?.tier ?? "").toLowerCase();
      const email = session.customer_email;
      if (email && TIER_MAP[tier]) {
        await prisma.user.update({ where: { email }, data: { tier: TIER_MAP[tier] } });
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as import("stripe").Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const email = await getCustomerEmail(stripe, customerId);
      if (email) {
        await prisma.user.update({ where: { email }, data: { tier: "FREE" } }).catch((err) => {
          console.warn("[webhook] user not found for downgrade:", email, err);
        });
      }
    }

    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as import("stripe").Stripe.Subscription;
      const tier = (sub.metadata?.tier ?? "").toLowerCase();
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const email = await getCustomerEmail(stripe, customerId);

      if (email) {
        if (TIER_MAP[tier] && sub.status === "active") {
          await prisma.user.update({ where: { email }, data: { tier: TIER_MAP[tier] } }).catch((err) => {
            console.warn("[webhook] user not found for upgrade:", email, err);
          });
        } else if (sub.status === "past_due" || sub.status === "unpaid") {
          // Payment failed and Stripe grace period is over — revoke access
          await prisma.user.update({ where: { email }, data: { tier: "FREE" } }).catch((err) => {
            console.warn("[webhook] user not found for past_due downgrade:", email, err);
          });
        }
      }
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as import("stripe").Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (customerId) {
        const email = await getCustomerEmail(stripe, customerId);
        // Log for monitoring — Stripe will retry and fire subscription.updated/deleted on final failure
        console.warn("[webhook] payment failed for customer:", email ?? customerId);
      }
    }
  } catch (err) {
    // Log but still return 200 — Stripe retries on non-2xx
    console.error("[membership/webhook] handler error", err);
  }

  return NextResponse.json({ received: true });
}
