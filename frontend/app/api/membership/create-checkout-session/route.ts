import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSiteUrl } from "@/lib/siteUrl";

export const runtime = "nodejs";

type MemberTier = "insider" | "vault";

const PRICE_IDS: Record<MemberTier, string | undefined> = {
  insider: process.env.STRIPE_INSIDER_PRICE_ID,
  vault: process.env.STRIPE_VAULT_PRICE_ID,
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Sign in to subscribe." }, { status: 401 });
  }

  const body = await req.json() as { tier?: string };
  const tier = body.tier as MemberTier;
  if (tier !== "insider" && tier !== "vault") {
    return NextResponse.json({ error: "Invalid tier." }, { status: 400 });
  }

  const origin = req.headers.get("origin") ?? getSiteUrl();

  // Dev bypass — no Stripe key. NEVER in production: fail loudly rather than
  // fake an active membership.
  if (!process.env.STRIPE_SECRET_KEY) {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
      return NextResponse.json(
        { error: "Payments are temporarily unavailable. Please try again shortly." },
        { status: 503 },
      );
    }
    return NextResponse.json({ url: `${origin}/membership/success?mock=1&tier=${tier}` });
  }

  const priceId = PRICE_IDS[tier];
  if (!priceId) {
    return NextResponse.json({ error: `Price ID for ${tier} not configured.` }, { status: 500 });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: session.user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/membership/success?session_id={CHECKOUT_SESSION_ID}&tier=${tier}`,
    cancel_url: `${origin}/membership`,
    metadata: {
      userId: (session.user as { id?: string }).id ?? "",
      tier,
    },
    subscription_data: {
      metadata: {
        userId: (session.user as { id?: string }).id ?? "",
        tier,
      },
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
