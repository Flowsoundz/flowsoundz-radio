import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Terms of Service — FlowSoundz Radio",
  description: "The terms and conditions governing use of FlowSoundz Radio.",
};

const LAST_UPDATED = "June 2026";
const CONTACT_EMAIL = "flowsoundzradio@gmail.com";

export default function TermsPage() {
  return (
    <AppShell eyebrow="Legal" title="Terms of Service">
      <div className="mx-auto max-w-2xl">
        <p className="mb-8 text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>

        <section className="prose prose-invert prose-sm max-w-none space-y-8 text-slate-300">

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">1. Acceptance of terms</h2>
            <p>
              By accessing or using FlowSoundz Radio (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">2. The service</h2>
            <p>
              FlowSoundz Radio is an internet radio platform that streams curated independent music. We reserve the right to modify, suspend, or discontinue any part of the Service at any time.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">3. Accounts</h2>
            <ul className="list-inside list-disc space-y-2">
              <li>You must provide accurate information when creating an account.</li>
              <li>You are responsible for maintaining the confidentiality of your account.</li>
              <li>You must be at least 13 years old to create an account.</li>
              <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">4. Membership and billing</h2>
            <ul className="list-inside list-disc space-y-2">
              <li>Paid memberships (Insider, Vault) are billed on a recurring monthly basis.</li>
              <li>You may cancel at any time through the billing portal. Access continues until the end of the current billing period.</li>
              <li>Refunds are issued at our discretion. Contact us within 7 days of a charge if you believe an error was made.</li>
              <li>We use Stripe for payment processing. Your payment information is governed by Stripe&apos;s terms and never stored on our servers.</li>
              <li>We reserve the right to change pricing with 30 days&apos; notice to active subscribers.</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">5. Artist submissions</h2>
            <ul className="list-inside list-disc space-y-2">
              <li>By submitting music, you confirm you own or are authorized to submit the content.</li>
              <li>Submission does not guarantee airplay or placement.</li>
              <li>We reserve the right to decline any submission without explanation.</li>
              <li>You retain full ownership of your music. Submission grants us a limited, non-exclusive license to stream the music if selected for rotation.</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">6. Prohibited conduct</h2>
            <p>You agree not to:</p>
            <ul className="mt-2 list-inside list-disc space-y-2">
              <li>Use the Service to distribute malware, spam, or unlawful content</li>
              <li>Attempt to reverse-engineer or circumvent security measures</li>
              <li>Scrape, copy, or redistribute our stream or content without permission</li>
              <li>Create multiple accounts to circumvent restrictions</li>
              <li>Submit music you do not have rights to</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">7. Intellectual property</h2>
            <p>
              The FlowSoundz Radio brand, interface, and non-artist content are owned by us. Music in rotation belongs to the respective artists and rights holders. Nothing in these terms transfers ownership of any content.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">8. Disclaimer of warranties</h2>
            <p>
              The Service is provided &ldquo;as is&rdquo; without warranties of any kind, express or implied. We do not guarantee the Service will be uninterrupted, error-free, or available at all times.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">9. Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, FlowSoundz Radio shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">10. Governing law</h2>
            <p>
              These terms are governed by the laws of the United States. Any disputes shall be resolved through binding arbitration or the courts of the applicable jurisdiction.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">11. Changes to terms</h2>
            <p>
              We may update these terms at any time. We will provide notice of material changes. Continued use of the Service constitutes acceptance of the updated terms.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">12. Contact</h2>
            <p>
              Questions about these terms? Contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-cyan-400 hover:text-cyan-300">{CONTACT_EMAIL}</a>{" "}
              or use our <Link href="/contact" className="text-cyan-400 hover:text-cyan-300">contact form</Link>.
            </p>
          </div>

        </section>

        <div className="mt-10 flex gap-4 text-xs text-slate-600">
          <Link href="/privacy" className="hover:text-slate-400">Privacy Policy</Link>
          <Link href="/contact" className="hover:text-slate-400">Contact</Link>
        </div>
      </div>
    </AppShell>
  );
}
