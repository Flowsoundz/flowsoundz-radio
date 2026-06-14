import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Copyright & DMCA Policy — FlowSoundz Radio",
  description:
    "How FlowSoundz Radio handles copyright, music rights, AI-generated submissions, and DMCA takedown notices.",
};

const LAST_UPDATED = "June 2026";
const DMCA_EMAIL = "flowsoundzradio@gmail.com";

export default function CopyrightPage() {
  return (
    <AppShell eyebrow="Legal" title="Copyright & DMCA Policy">
      <div className="mx-auto max-w-2xl">
        <p className="mb-8 text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>

        <section className="prose prose-invert prose-sm max-w-none space-y-8 text-slate-300">
          <div>
            <h2 className="mb-3 text-base font-semibold text-white">1. We only broadcast licensed music</h2>
            <p>
              FlowSoundz Radio broadcasts music in two categories only: (a) original recordings
              owned by FlowSoundz, and (b) recordings submitted by artists who have expressly
              granted us a license to broadcast them. We do not knowingly stream any recording for
              which we lack a direct license or ownership. Every artist submission requires the
              submitter to confirm, before review, that they own or control 100% of both the sound
              recording and the underlying composition (or have cleared all third-party rights),
              and grant FlowSoundz a non-exclusive license to broadcast the work.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">2. AI-assisted and AI-generated submissions</h2>
            <p>
              Submitters must disclose whether a track was created with AI tools and which tools
              were used. By submitting AI-assisted or AI-generated music, you represent that your
              use complies with the terms of service of the AI tools involved and that you hold all
              rights necessary to grant us the broadcast license. You are solely responsible for the
              rights status of AI-generated material you submit. FlowSoundz may label such tracks as
              AI-assisted for listener transparency and may decline or remove any submission at its
              discretion.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">3. Filing a DMCA takedown notice</h2>
            <p>
              If you believe content on FlowSoundz Radio infringes your copyright, send a written
              notice to our designated agent at{" "}
              <a href={`mailto:${DMCA_EMAIL}`} className="text-cyan-300">{DMCA_EMAIL}</a>{" "}
              (subject line: &ldquo;DMCA Notice&rdquo;) including:
            </p>
            <ul className="list-inside list-disc space-y-2">
              <li>Your physical or electronic signature.</li>
              <li>Identification of the copyrighted work you claim is infringed.</li>
              <li>Identification of the material on our Service and enough detail to locate it (track title / URL).</li>
              <li>Your contact information (address, phone, email).</li>
              <li>A statement that you have a good-faith belief the use is not authorized by the rights holder, its agent, or the law.</li>
              <li>A statement, under penalty of perjury, that the information is accurate and that you are the rights holder or authorized to act on their behalf.</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">4. Counter-notices</h2>
            <p>
              If your content was removed and you believe that was a mistake or misidentification,
              you may send a counter-notice to the same address with your signature, identification
              of the removed material, a statement under penalty of perjury that you have a
              good-faith belief it was removed by mistake, and your consent to jurisdiction in your
              district.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">5. Repeat-infringer policy</h2>
            <p>
              FlowSoundz Radio will, in appropriate circumstances and at its discretion, disable or
              terminate the accounts of artists or users who are the subject of repeated valid
              infringement notices. Tracks subject to a valid notice are removed from rotation
              promptly upon receipt.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-white">6. Performance royalties</h2>
            <p>
              FlowSoundz Radio is committed to compensating rights holders for the public
              performance of their works as required by applicable law, including through direct
              artist licenses and any applicable collective-licensing arrangements.
            </p>
          </div>

          <p className="border-t border-white/8 pt-6 text-xs text-slate-500">
            Questions about this policy? Email{" "}
            <a href={`mailto:${DMCA_EMAIL}`} className="text-cyan-300">{DMCA_EMAIL}</a>. See also our{" "}
            <Link href="/terms" className="text-cyan-300">Terms of Service</Link> and{" "}
            <Link href="/privacy" className="text-cyan-300">Privacy Policy</Link>.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
