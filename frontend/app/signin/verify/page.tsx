import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export default function VerifyRequestPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050816] px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/3 top-1/4 h-96 w-96 rounded-full bg-[#00e5ff]/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <BrandLogo variant="full" />
        </div>

        <div className="rounded-[2rem] border border-cyan-400/20 bg-[#0B1020]/90 p-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-400/10 ring-1 ring-cyan-400/25">
              <svg className="h-7 w-7 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
          </div>
          <h1 className="text-xl font-semibold text-white">Check your inbox</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            A sign-in link is on its way. Click the link in your email to continue.
          </p>
          <p className="mt-2 text-xs text-slate-600">Link expires in 24 hours.</p>

          <Link
            href="/radio"
            className="mt-6 inline-flex items-center rounded-full border border-white/10 px-5 py-2 text-sm text-slate-400 transition hover:border-white/20 hover:text-white"
          >
            ← Back to radio
          </Link>
        </div>
      </div>
    </div>
  );
}
