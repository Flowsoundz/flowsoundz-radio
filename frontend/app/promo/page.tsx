import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { PromoCheckoutPage } from "@/components/PromoCheckoutPage";

export const metadata: Metadata = {
  title: "Artist Promo — FlowSoundz Radio",
  description:
    "Submit your track for FlowSoundz Radio rotation and featured placement. Secure checkout, human curation review, and direct path to underground radio.",
  openGraph: {
    title: "FlowSoundz Artist Promo Portal",
    description: "Get your music into FlowSoundz Radio rotation.",
  },
};

function PromoCheckoutFallback() {
  return (
    <AppShell
      eyebrow="Promo"
      title="Artist Promo Portal"
      subtitle="A direct submission lane for artists who want secure checkout first, then a clean review path into FlowSoundz rotation, featured consideration, and sponsored placement."
    >
      <section className="glass-card rounded-[2rem] border border-white/8 bg-[#0B1020]/86 p-6 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-40 rounded-full bg-white/10" />
          <div className="h-10 w-72 rounded-2xl bg-white/10" />
          <div className="h-24 rounded-[1.5rem] bg-white/5" />
        </div>
      </section>
    </AppShell>
  );
}

export default function PromoPage() {
  return (
    <Suspense fallback={<PromoCheckoutFallback />}>
      <PromoCheckoutPage />
    </Suspense>
  );
}
