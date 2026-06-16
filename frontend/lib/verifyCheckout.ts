import Stripe from "stripe";

// Server-side confirmation that a Stripe Checkout session was actually paid —
// so success pages only celebrate when there's proof, not just because someone
// loaded the URL. Webhooks remain the source of truth for granting access; this
// is purely the success-screen gate. Returns false on any missing key / error.
export async function isCheckoutPaid(sessionId: string | undefined | null): Promise<boolean> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!sessionId || !key) return false;
  try {
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return session.payment_status === "paid" || session.status === "complete";
  } catch {
    return false;
  }
}
