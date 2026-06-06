import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ received: true });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: import("stripe").Stripe.Event;
  const body = await req.text();

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body) as import("stripe").Stripe.Event;
    }
  } catch (err) {
    console.error("[membership/webhook] signature error", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const tierMap: Record<string, "INSIDER" | "VAULT"> = {
    insider: "INSIDER",
    vault: "VAULT",
  };

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as import("stripe").Stripe.Checkout.Session;
      const tier = (session.metadata?.tier ?? "").toLowerCase();
      const email = session.customer_email;
      if (email && tierMap[tier]) {
        await prisma.user.update({
          where: { email },
          data: { tier: tierMap[tier] },
        });
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as import("stripe").Stripe.Subscription;
      const email = typeof sub.customer === "string"
        ? (await stripe.customers.retrieve(sub.customer) as import("stripe").Stripe.Customer).email
        : null;
      if (email) {
        await prisma.user.update({
          where: { email },
          data: { tier: "FREE" },
        });
      }
    }

    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as import("stripe").Stripe.Subscription;
      const tier = (sub.metadata?.tier ?? "").toLowerCase();
      const email = typeof sub.customer === "string"
        ? (await stripe.customers.retrieve(sub.customer) as import("stripe").Stripe.Customer).email
        : null;
      if (email && tierMap[tier] && sub.status === "active") {
        await prisma.user.update({
          where: { email },
          data: { tier: tierMap[tier] },
        });
      }
    }
  } catch (err) {
    console.error("[membership/webhook] db error", err);
  }

  return NextResponse.json({ received: true });
}
