import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PromoSubmissionForm } from "@/components/PromoSubmissionForm";
import type { PromoTier } from "@/lib/stripe";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

type VerificationResult = {
  amount_paid: number;
  package_tier: PromoTier;
  payment_status: "paid";
  stripe_session_id: string;
};

async function verifySession(
  sessionId: string,
): Promise<VerificationResult | null> {
  const response = await fetch(
    `${API_BASE}/promo/verify-session?session_id=${encodeURIComponent(sessionId)}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as VerificationResult;
}

export default async function PromoSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId = "" } = await searchParams;
  const verification = sessionId ? await verifySession(sessionId) : null;

  return (
    <AppShell
      eyebrow="Promo"
      title="Payment confirmed"
      subtitle="Complete your FlowSoundz submission below."
    >
      {verification ? (
        <PromoSubmissionForm
          amountPaid={verification.amount_paid}
          packageTier={verification.package_tier}
          stripeSessionId={verification.stripe_session_id}
        />
      ) : (
        <section className="glass-card rounded-[2rem] border border-white/8 bg-[#0B1020]/86 p-6 md:p-8">
          <h2 className="font-display text-2xl font-semibold text-[#F8FAFC]">
            We couldn’t verify that payment session.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#CBD5E1]">
            Return to the promo page and start checkout again. No submission was
            created.
          </p>
          <Link
            href="/promo"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full border border-white/12 bg-white/6 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
          >
            Back to promo packages
          </Link>
        </section>
      )}
    </AppShell>
  );
}
