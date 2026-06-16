import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { sendPromoLeadNotification, sendMembershipWelcomeEmail } from "@/lib/mailer";
import { appendPromoPayment, type PromoPaymentTier } from "@/lib/promoPaymentStore";

// ── Unified Stripe event handler ──────────────────────────────────────────────
// A Stripe webhook endpoint has ONE signing secret per URL, and we only have one
// STRIPE_WEBHOOK_SECRET. So every webhook route delegates here — whichever single
// URL is registered in Stripe handles ALL payment types, and the priority-review
// money path can't silently break just because the "wrong" route was registered.
//
// checkout.session.completed dispatches by metadata, in priority order:
//   1. type === "submission_review"  → mark the artist submission's reviewPaidAt
//   2. metadata.tier (insider|vault) → upgrade the user's membership tier
//   3. otherwise                     → record a promo payment + notify
// Subscription lifecycle events keep membership tiers in sync.

const TIER_MAP: Record<string, "INSIDER" | "VAULT"> = {
  insider: "INSIDER",
  vault: "VAULT",
};

async function getCustomerEmail(stripe: Stripe, customerId: string): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return null;
    return (customer as Stripe.Customer).email ?? null;
  } catch {
    return null;
  }
}

async function handleCheckoutCompleted(stripe: Stripe, session: Stripe.Checkout.Session) {
  // 1. Priority-review payment for an artist submission.
  if (session.metadata?.type === "submission_review" && session.metadata?.submission_id) {
    await prisma.artistSubmission
      .update({
        where: { id: session.metadata.submission_id },
        data: { reviewPaidAt: new Date() },
      })
      .catch(() => undefined);
    return;
  }

  // 2. Membership checkout (insider / vault).
  const tier = (session.metadata?.tier ?? "").toLowerCase();
  if (TIER_MAP[tier]) {
    const email = session.customer_email ?? session.customer_details?.email ?? null;
    if (email) {
      await prisma.user
        .update({ where: { email }, data: { tier: TIER_MAP[tier] } })
        .catch((err) => console.warn("[stripe] membership upgrade — user not found:", email, err));
      void sendMembershipWelcomeEmail({ email, tier: TIER_MAP[tier] }).catch(() => undefined);
    }
    return;
  }

  // 3. Promo package payment.
  const artistName = session.metadata?.artist_name ?? "Unknown";
  const songTitle = session.metadata?.song_title ?? "";
  const promoTier = session.metadata?.package_tier ?? "basic";
  const email = session.customer_details?.email ?? "";
  const amount = session.amount_total ?? 0;
  const now = new Date().toISOString();

  void appendPromoPayment({
    id: `promo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
    tier: (["basic", "featured", "sponsored"].includes(promoTier) ? promoTier : "basic") as PromoPaymentTier,
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
    budgetRange: `$${(amount / 100).toFixed(2)} — ${promoTier} tier (paid)`,
    email,
    submittedAt: now,
  }).catch(() => undefined);
}

export async function handleStripeEvent(stripe: Stripe, event: Stripe.Event): Promise<void> {
  // Idempotency: Stripe retries on timeout. Record each event id once; a
  // duplicate insert (unique PK) means we've already handled it — skip.
  try {
    await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch {
    return;
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(stripe, event.data.object as Stripe.Checkout.Session);
      break;

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const email = await getCustomerEmail(stripe, customerId);
      if (email) {
        await prisma.user
          .update({ where: { email }, data: { tier: "FREE" } })
          .catch((err) => console.warn("[stripe] downgrade — user not found:", email, err));
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const tier = (sub.metadata?.tier ?? "").toLowerCase();
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const email = await getCustomerEmail(stripe, customerId);
      if (email) {
        if (TIER_MAP[tier] && sub.status === "active") {
          await prisma.user
            .update({ where: { email }, data: { tier: TIER_MAP[tier] } })
            .catch((err) => console.warn("[stripe] upgrade — user not found:", email, err));
        } else if (sub.status === "past_due" || sub.status === "unpaid") {
          await prisma.user
            .update({ where: { email }, data: { tier: "FREE" } })
            .catch((err) => console.warn("[stripe] past_due downgrade — user not found:", email, err));
        }
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (customerId) {
        const email = await getCustomerEmail(stripe, customerId);
        console.warn("[stripe] payment failed for customer:", email ?? customerId);
      }
      break;
    }

    default:
      break;
  }
}
