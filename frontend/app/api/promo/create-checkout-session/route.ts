import type { NextRequest } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

type PackageTier = "basic" | "featured" | "sponsored";

const PACKAGES: Record<PackageTier, { name: string; amount: number; description: string }> = {
  basic: {
    name: "Basic Submission",
    amount: 1500,
    description: "Priority review queue with artist details, vibe notes, and a manual listen from the FlowSoundz team.",
  },
  featured: {
    name: "Featured Consideration",
    amount: 4500,
    description: "Priority review for records that may fit featured placement, homepage visibility, or curated station moments.",
  },
  sponsored: {
    name: "Sponsored Rotation",
    amount: 9500,
    description: "High-visibility promo lane for premium station presence, sponsored support, and elevated release visibility.",
  },
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  // Dev bypass — no Stripe key configured, return a mock success URL
  if (!secretKey) {
    let mockBody: { package_tier?: unknown; artist_name?: unknown; song_title?: unknown; origin?: unknown };
    try {
      mockBody = (await request.json()) as typeof mockBody;
    } catch {
      mockBody = {};
    }
    const mockTier = str(mockBody.package_tier) || "basic";
    const mockOrigin = str(mockBody.origin) || request.headers.get("origin") || "https://flowsoundzradio.com";
    const mockArtist = str(mockBody.artist_name);
    const mockSong = str(mockBody.song_title);

    const { appendPromoPayment } = await import("@/lib/promoPaymentStore");
    const now = new Date().toISOString();
    await appendPromoPayment({
      id: `mock_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
      tier: (["basic", "featured", "sponsored"].includes(mockTier) ? mockTier : "basic") as import("@/lib/promoPaymentStore").PromoPaymentTier,
      artistName: mockArtist || "Test Artist",
      songTitle: mockSong || "",
      email: "test@mock.dev",
      amountCents: mockTier === "sponsored" ? 9500 : mockTier === "featured" ? 4500 : 1500,
      stripeSessionId: `mock_session_${Date.now().toString(36)}`,
      status: "pending_review",
      internalNotes: null,
    }).catch(() => undefined);

    const params = new URLSearchParams({ mock: "1", tier: mockTier });
    return Response.json({ url: `${mockOrigin}/promo/success?${params.toString()}` });
  }

  let body: { package_tier?: unknown; artist_name?: unknown; song_title?: unknown; origin?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const tier = str(body.package_tier) as PackageTier;
  if (!PACKAGES[tier]) {
    return Response.json({ error: "Invalid package tier." }, { status: 422 });
  }

  const origin = str(body.origin) || request.headers.get("origin") || "https://flowsoundzradio.com";
  const pkg = PACKAGES[tier];
  const artistName = str(body.artist_name);
  const songTitle = str(body.song_title);

  const stripe = new Stripe(secretKey);

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `FlowSoundz Radio — ${pkg.name}`,
              description: pkg.description,
              images: [`${origin}/FSRLogo.svg`],
            },
            unit_amount: pkg.amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/promo/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/promo`,
      metadata: {
        package_tier: tier,
        artist_name: artistName || "Unknown",
        song_title: songTitle || "",
      },
      custom_text: {
        submit: {
          message: "Approval is not automatic — every track receives a manual listen. You'll be contacted within 48-72 hours.",
        },
      },
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("[promo/create-checkout-session]", err);
    return Response.json({ error: "Unable to start checkout right now." }, { status: 500 });
  }
}
