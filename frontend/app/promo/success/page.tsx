import Link from "next/link";
import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Promo — FlowSoundz Radio",
};

export default function PromoSuccessPage() {
  return (
    <AppShell
      eyebrow="Promo"
      title="Looking to submit your music?"
      subtitle="Use the free submission path or reach out through the promo request form."
    >
      <section className="glass-card rounded-[2rem] border border-white/8 bg-[#0B1020]/86 p-6 md:p-8">
        <p className="text-sm leading-6 text-slate-300">
          Paid promo lanes are launching soon. In the meantime, submit your track for free review or send a promo request through the form below.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/artist/submit"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_18px_rgba(0,229,255,0.35)] transition"
          >
            Submit for Free
          </Link>
          <Link
            href="/promo"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/5"
          >
            Promo Page
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
