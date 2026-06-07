import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Privacy Policy — FlowSoundz Radio",
  description: "How FlowSoundz Radio collects, uses, and protects your personal information.",
};

const LAST_UPDATED = "June 2026";
const CONTACT_EMAIL = "flowsoundzradio@gmail.com";

export default function PrivacyPage() {
  return (
    <AppShell eyebrow="Legal" title="Privacy Policy">
      <div className="mx-auto max-w-2xl">
        <p className="mb-8 text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>

        <section className="prose prose-invert prose-sm max-w-none space-y-8 text-slate-300">

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">1. Who we are</h2>
            <p>
              FlowSoundz Radio (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the website and streaming platform at{" "}
              <strong className="text-white">flowsoundzradio.com</strong>. We curate and stream independent music to listeners and provide promotional tools for artists.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">2. Information we collect</h2>
            <ul className="list-inside list-disc space-y-2">
              <li><strong className="text-white">Account information:</strong> Email address, name, and profile picture when you sign in via email magic link or Google OAuth.</li>
              <li><strong className="text-white">Membership data:</strong> Subscription tier and billing information processed through Stripe. We do not store payment card details — Stripe handles all payment processing.</li>
              <li><strong className="text-white">Usage data:</strong> Pages visited, songs played, and votes (hype/skip) to improve radio rotation. This data is not sold.</li>
              <li><strong className="text-white">Communications:</strong> Messages sent through our contact form and artist release submissions.</li>
              <li><strong className="text-white">Technical data:</strong> IP address, browser type, and device type collected automatically for security and performance purposes.</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">3. How we use your information</h2>
            <ul className="list-inside list-disc space-y-2">
              <li>Authenticating your account and maintaining your session</li>
              <li>Processing membership subscriptions and billing</li>
              <li>Personalizing radio rotation based on your vote history</li>
              <li>Responding to contact and artist submission inquiries</li>
              <li>Sending transactional emails (magic links, membership confirmations)</li>
              <li>Improving our platform and fixing bugs</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">4. Sharing your information</h2>
            <p>We do not sell your personal data. We share data only with:</p>
            <ul className="mt-2 list-inside list-disc space-y-2">
              <li><strong className="text-white">Stripe:</strong> For payment processing. Governed by <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">Stripe&apos;s Privacy Policy</a>.</li>
              <li><strong className="text-white">Google:</strong> If you use Google sign-in. Governed by <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">Google&apos;s Privacy Policy</a>.</li>
              <li><strong className="text-white">Vercel / Neon:</strong> Our hosting and database providers, under data processing agreements.</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">5. Cookies and storage</h2>
            <p>
              We use session cookies to keep you signed in (via a secure JWT token stored in an HTTP-only cookie). We do not use advertising or tracking cookies. No third-party analytics cookies are placed on your device.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">6. Data retention</h2>
            <p>
              Account data is retained for as long as your account is active. If you request deletion, we will remove your personal data within 30 days, except where retention is required by law (e.g., financial records).
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">7. Your rights</h2>
            <p>Depending on your location, you may have the right to:</p>
            <ul className="mt-2 list-inside list-disc space-y-2">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing</li>
              <li>Data portability</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-cyan-400 hover:text-cyan-300">{CONTACT_EMAIL}</a>.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">8. Security</h2>
            <p>
              We use industry-standard security practices including HTTPS, HTTP-only cookies, and Stripe-handled payment data. No system is 100% secure — if you discover a vulnerability, please report it to us directly.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">9. Children</h2>
            <p>
              FlowSoundz Radio is not directed at children under 13. We do not knowingly collect personal data from children. If you believe a child has provided us with data, contact us and we will delete it.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">10. Changes to this policy</h2>
            <p>
              We may update this policy periodically. We will notify active users of material changes via email. Continued use of the service after changes constitutes acceptance.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">11. Contact</h2>
            <p>
              Questions about this privacy policy? Email us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-cyan-400 hover:text-cyan-300">{CONTACT_EMAIL}</a>{" "}
              or use our <Link href="/contact" className="text-cyan-400 hover:text-cyan-300">contact form</Link>.
            </p>
          </div>

        </section>

        <div className="mt-10 flex gap-4 text-xs text-slate-600">
          <Link href="/terms" className="hover:text-slate-400">Terms of Service</Link>
          <Link href="/contact" className="hover:text-slate-400">Contact</Link>
        </div>
      </div>
    </AppShell>
  );
}
