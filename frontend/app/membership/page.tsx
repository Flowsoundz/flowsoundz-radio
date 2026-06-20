import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { MembershipFAQ } from "@/components/MembershipFAQ";
import { MembershipCheckoutButton } from "@/components/MembershipCheckoutButton";

export const metadata: Metadata = {
  title: "Membership — FlowSoundz Radio",
  description:
    "Start free with live radio and discovery. Upgrade to Insider or Vault for replay, deeper access, and premium FlowSoundz moments.",
  openGraph: {
    title: "FlowSoundz Membership — Insider & Vault",
    description: "Live radio first. On-demand depth and premium access when you want more control.",
  },
};

const tiers = [
  {
    name: "Listener",
    eyebrow: "Free Access",
    price: "Free",
    priceSub: null as string | null,
    badge: null as string | null,
    eyebrowColor: "text-slate-400/80",
    accent: "border-white/8 bg-white/[0.03]",
    glow: null as string | null,
    position: "Where it starts.",
    cta: { label: "Start listening", href: "/radio" },
    ctaStyle: "outlined" as "outlined" | "gradient" | "fuchsia",
    perks: [
      "Public live radio with discovery-first programming.",
      "Artist pages, song pages, and station schedule.",
      "The full FlowSoundz front door without a paywall.",
    ],
  },
  {
    name: "Insider",
    eyebrow: "Members Early",
    price: "$7.99",
    priceSub: "/mo",
    badge: "Most Popular" as string | null,
    eyebrowColor: "text-cyan-300/90",
    accent:
      "border-cyan-300/25 bg-[linear-gradient(180deg,rgba(34,211,238,0.14)_0%,rgba(255,255,255,0.04)_100%)]",
    glow: "0 0 20px rgba(0,230,255,0.4), 0 0 40px rgba(0,230,255,0.15)",
    position: "The discovery sweet spot.",
    cta: { label: "Get notified when Insider opens", href: "#early-access" },
    ctaStyle: "gradient" as "outlined" | "gradient" | "fuchsia",
    perks: [
      "Everything in Free.",
      "Recent replay and more control after a song airs.",
      "Early access windows, Behind the Mix notes, and deeper artist context.",
    ],
  },
  {
    name: "Vault",
    eyebrow: "Founder Circle",
    price: "$14.99",
    priceSub: "/mo",
    badge: "Most Exclusive" as string | null,
    eyebrowColor: "text-fuchsia-300/90",
    accent:
      "border-fuchsia-400/30 bg-[linear-gradient(180deg,rgba(217,70,239,0.18)_0%,rgba(139,92,246,0.10)_100%)]",
    glow: null,
    position: "For listeners who want everything.",
    cta: { label: "Get notified when Vault opens", href: "#early-access" },
    ctaStyle: "fuchsia" as "outlined" | "gradient" | "fuchsia",
    perks: [
      "Everything in Insider.",
      "Deep archive and premium member-only station moments.",
      "Earliest access to exclusives, drops, and premium listening layers.",
    ],
  },
];

const ctaClasses = {
  outlined:
    "border border-white/20 bg-white/5 text-slate-200 hover:border-white/30 hover:bg-white/10",
  gradient:
    "bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] text-white font-bold shadow-[0_0_18px_rgba(0,229,255,0.35)] hover:shadow-[0_0_28px_rgba(0,229,255,0.55)]",
  fuchsia:
    "border border-fuchsia-400/35 bg-fuchsia-400/10 text-fuchsia-50 hover:border-fuchsia-400/55 hover:bg-fuchsia-400/18",
};

const comparisonRows = [
  { feature: "Public radio rotation", listener: "Included", insider: "Included", vault: "Included" },
  { feature: "Artist and song discovery", listener: "Included", insider: "Included", vault: "Included" },
  { feature: "Recent replay", listener: "Limited / none", insider: "Included", vault: "Included" },
  { feature: "On-demand depth", listener: "Radio-first only", insider: "Selective access", vault: "Deep access" },
  { feature: "Behind the Mix", listener: "—", insider: "Included", vault: "Expanded" },
  { feature: "Exclusive drops", listener: "Public window only", insider: "Early access", vault: "Earliest + premium" },
  { feature: "Membership lane", listener: "Listener", insider: "Insider", vault: "Vault" },
];

export default function MembershipPage() {
  return (
    <AppShell
      eyebrow="Membership"
      title="Join the FlowSoundz circle"
      subtitle="FlowSoundz is built in layers: live radio first, more control second, premium access on top. Start free, then upgrade when you want replay, deeper access, and member-only moments."
    >
      <div className="mb-8 rounded-[1.8rem] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(0,229,255,0.09),rgba(124,77,255,0.08),rgba(255,45,166,0.06))] px-6 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
          How it works
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-200">
          The station stays public. Membership is for listeners who want more control, more replay, and more access after discovery happens.
        </p>
      </div>

      <section className="mb-10 grid gap-4 lg:grid-cols-3">
        {[
          {
            title: "Free gets you in",
            body: "No one should have to pay just to understand FlowSoundz. Live radio, discovery, and artist context stay open.",
          },
          {
            title: "Insider adds control",
            body: "Insider is for people who hear something on radio and want replay, context, and a stronger connection to the station.",
          },
          {
            title: "Vault goes deeper",
            body: "Vault is for the listener who wants the archive, premium drops, and the deepest version of the culture layer.",
          },
        ].map((item) => (
          <div key={item.title} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] px-5 py-5">
            <p className="text-sm font-semibold text-white">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {tiers.map((tier) => (
          <article
            key={tier.name}
            className={`glass-card flex flex-col rounded-[1.8rem] border p-6 ${tier.accent}`}
            style={tier.glow ? { boxShadow: tier.glow } : undefined}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${tier.eyebrowColor}`}>
                  {tier.eyebrow}
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-white">
                  {tier.name}
                </h2>
                <div className="mt-2 flex items-end gap-1">
                  <span className="font-headline text-4xl leading-none text-white">
                    {tier.price}
                  </span>
                  {tier.priceSub && (
                    <span className="mb-0.5 text-sm text-white/35">{tier.priceSub}</span>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-white/35">{tier.position}</p>
              </div>
              {tier.badge ? (
                <span
                  className={`mt-0.5 shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                    tier.name === "Vault"
                      ? "border border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200/80"
                      : "border border-cyan-300/20 bg-cyan-300/10 text-cyan-200/80"
                  }`}
                >
                  {tier.badge}
                </span>
              ) : null}
            </div>

            <div className="mt-5 flex-1 space-y-2.5">
              {tier.perks.map((perk) => (
                <div
                  key={perk}
                  className="flex items-start gap-2.5 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3"
                >
                  <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-white/25" />
                  <p className="text-sm leading-6 text-slate-200">{perk}</p>
                </div>
              ))}
            </div>

            {tier.name === "Insider" ? (
              <MembershipCheckoutButton
                tier="insider"
                className={`mt-6 ${ctaClasses[tier.ctaStyle]}`}
              />
            ) : tier.name === "Vault" ? (
              <MembershipCheckoutButton
                tier="vault"
                className={`mt-6 ${ctaClasses[tier.ctaStyle]}`}
              />
            ) : (
              <Link
                href={tier.cta.href}
                className={`mt-6 inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm transition ${ctaClasses[tier.ctaStyle]}`}
              >
                {tier.cta.label}
              </Link>
            )}
          </article>
        ))}
      </section>

      <section className="mt-10 glass-card overflow-hidden rounded-[1.8rem] border border-white/8">
        <div className="border-b border-white/8 px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
            Compare tiers
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Listener vs Insider vs Vault
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead className="bg-white/[0.03] text-[11px] uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-6 py-4 font-semibold">Feature</th>
                <th className="px-6 py-4 font-semibold">Listener</th>
                <th className="px-6 py-4 font-semibold">Insider</th>
                <th className="px-6 py-4 font-semibold">Vault</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.feature} className="border-t border-white/8">
                  <td className="px-6 py-4 font-medium text-white">{row.feature}</td>
                  <td className="px-6 py-4">{row.listener}</td>
                  <td className="px-6 py-4 text-cyan-100">{row.insider}</td>
                  <td className="px-6 py-4 text-fuchsia-100">{row.vault}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <MembershipFAQ />

      <div className="mt-10 rounded-[1.8rem] border border-white/8 bg-white/[0.025] px-8 py-8 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Questions?</p>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Memberships renew monthly and can be cancelled any time from the{" "}
          <strong className="text-white">Manage billing</strong> option in your account menu.
          Reach us at{" "}
          <a href="mailto:flowsoundzradio@gmail.com" className="text-cyan-400 hover:text-cyan-300">
            flowsoundzradio@gmail.com
          </a>{" "}
          with any questions.
        </p>
      </div>
    </AppShell>
  );
}
