"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "Can I cancel anytime?",
    a: "Yes — no contracts, no lock-ins. Cancel your Insider or Vault membership at any time from your account settings. You'll keep access through the end of your billing period.",
  },
  {
    q: "What is a Midnight Drop?",
    a: "Midnight Drops are late-night release moments — curated tracks dropped at midnight around cultural timing, not catalog volume. Members get priority access before the public window opens.",
  },
  {
    q: "How do I submit my release for promo?",
    a: "Head to the For Artists page and fill out the submission form. Artist Pro members get priority review, featured placement consideration, and sponsored visibility across the station.",
  },
  {
    q: "Are Insider and Vault memberships available now?",
    a: "Yes — both tiers are open. Pick a plan above to subscribe; you can cancel any time, no contracts or hidden fees.",
  },
];

export function MembershipFAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="mt-10">
      <h2 className="mb-6 font-display text-lg font-semibold text-white/70">
        Common questions
      </h2>
      <div className="flex flex-col gap-3">
        {FAQS.map((faq, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden"
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition hover:bg-white/[0.03]"
            >
              <span className="text-sm font-semibold text-white/80">{faq.q}</span>
              <svg
                className={`h-4 w-4 shrink-0 text-white/30 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {open === i && (
              <p className="px-6 pb-5 text-sm leading-6 text-white/45">{faq.a}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
