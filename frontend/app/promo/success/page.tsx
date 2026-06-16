import Link from "next/link";
import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { isCheckoutPaid } from "@/lib/verifyCheckout";

export const metadata: Metadata = {
  title: "Payment Confirmed — FlowSoundz Radio",
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PromoSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const isMock = params.mock === "1";
  const sessionId = typeof params.session_id === "string" ? params.session_id : undefined;
  const paid = isMock || (await isCheckoutPaid(sessionId));

  // Don't celebrate a payment we can't confirm (e.g. someone opened this URL
  // directly). Show a neutral "confirming" state instead.
  if (!paid) {
    return (
      <AppShell eyebrow="Promo" title="Confirming payment">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="text-xl font-semibold text-white">We&apos;re confirming your payment.</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            If you just completed checkout, your Stripe receipt is the confirmation — your submission
            is queued and you&apos;ll hear back by email. If you reached this page by mistake, no charge was made.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/radio" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-6 text-sm font-bold text-white">
              Tune in to FlowSoundz
            </Link>
            <Link href="/contact" className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 px-6 text-sm text-slate-300 transition hover:border-white/20 hover:text-white">
              Contact us
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell eyebrow="Promo" title="Payment Confirmed">
      <div className="mx-auto max-w-lg text-center">

        {isMock && (
          <div className="mb-6 rounded-[1.2rem] border border-amber-400/20 bg-amber-400/[0.08] px-4 py-3 text-sm text-amber-200">
            Test mode — no real charge was made. Add{" "}
            <code className="rounded bg-white/5 px-1 text-xs text-amber-300">STRIPE_SECRET_KEY</code>{" "}
            to go live.
          </div>
        )}

        <div className="mb-8 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(0,229,255,0.18),rgba(124,77,255,0.18))] ring-1 ring-[#00e5ff]/30">
            <svg className="h-10 w-10 text-[#00e5ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-white">You&apos;re in the queue.</h2>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          Your payment was received. The FlowSoundz curation team will review your submission and get back to you within{" "}
          <strong className="text-white">48–72 hours</strong>.
        </p>

        <div className="mt-8 grid gap-3 text-left">
          {[
            { step: "01", accent: "#00e5ff", title: "Manual listen", body: "Every submission gets a real listen — no algorithm shortcuts." },
            { step: "02", accent: "#7c4dff", title: "Curation decision", body: "The team decides if the track fits the current FlowSoundz rotation and schedules placement." },
            { step: "03", accent: "#ff2da6", title: "Email confirmation", body: "You'll hear back either way. Approved tracks move into rotation scheduling immediately." },
          ].map((item) => (
            <div key={item.step} className="glass-card flex items-start gap-4 rounded-[1.4rem] p-4">
              <span className="text-[1.6rem] font-bold leading-none" style={{ color: item.accent, opacity: 0.25 }}>
                {item.step}
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-400">{item.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/radio"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-6 text-sm font-bold text-white shadow-[0_0_18px_rgba(0,229,255,0.3)] transition hover:shadow-[0_0_28px_rgba(0,229,255,0.5)]"
          >
            Tune in to FlowSoundz
          </Link>
          <Link
            href="/artist/submit"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 px-6 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            Submit another track
          </Link>
        </div>

        {!isMock && (
          <p className="mt-6 text-xs text-white/25">
            A payment receipt was sent to your email by Stripe. Questions?{" "}
            <Link href="/contact" className="text-cyan-400/60 transition hover:text-cyan-300">
              Contact us
            </Link>.
          </p>
        )}
      </div>
    </AppShell>
  );
}
