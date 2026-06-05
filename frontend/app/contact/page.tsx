import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact — FlowSoundz Radio",
  description:
    "Reach the FlowSoundz Radio team — general inquiries, artist submissions, partnership and sponsorship opportunities.",
};

export default function ContactPage() {
  return (
    <AppShell eyebrow="Contact" title="Get in Touch">

      <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">

        {/* ── Left: context ── */}
        <div className="flex flex-col gap-8">
          <p className="text-sm leading-7 text-slate-300">
            We&apos;re a small team — we read every message. Pick the right topic
            and we&apos;ll get back to you directly.
          </p>

          <div className="flex flex-col gap-5">
            <ContactCard
              accent="#00e5ff"
              title="Artist Submissions"
              body="Want to get your music on the station? Use the Artist Submission topic — or go straight to the Promo page for a faster review."
              email="submissions@flowsoundz.com"
            />
            <ContactCard
              accent="#7c4dff"
              title="Partnerships & Sponsorships"
              body="Brand placements, sponsored slots, or collaborations. Select Partnership and give us the details."
              email="partnerships@flowsoundz.com"
            />
            <ContactCard
              accent="#ff2da6"
              title="General Inquiries"
              body="Feedback, press, or just saying hello. General Inquiry covers it."
              email="contact@flowsoundz.com"
            />
          </div>

          <Link
            href="/for-artists"
            className="inline-flex items-center gap-2 text-sm font-medium text-cyan-400 transition hover:text-cyan-300"
          >
            Submit your music
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* ── Right: form ── */}
        <div className="glass-card rounded-[1.8rem] p-6 sm:p-8">
          <ContactForm />
        </div>

      </div>

    </AppShell>
  );
}

function ContactCard({
  accent,
  title,
  body,
  email,
}: {
  accent: string;
  title: string;
  body: string;
  email: string;
}) {
  return (
    <div className="flex gap-4">
      <div
        className="mt-1 h-2 w-2 shrink-0 rounded-full"
        style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
      />
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-400">{body}</p>
        <a
          href={`mailto:${email}`}
          className="mt-2 inline-flex text-sm font-medium text-cyan-400 transition hover:text-cyan-300"
        >
          {email}
        </a>
      </div>
    </div>
  );
}
