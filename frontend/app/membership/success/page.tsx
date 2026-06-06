import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export default async function MembershipSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; mock?: string }>;
}) {
  const { tier, mock } = await searchParams;
  const isMock = mock === "1";
  const tierLabel = tier === "vault" ? "Vault" : "Insider";
  const tierColor = tier === "vault" ? "text-fuchsia-300" : "text-cyan-300";
  const tierBorder = tier === "vault" ? "border-fuchsia-400/20" : "border-cyan-400/20";
  const tierBg = tier === "vault" ? "bg-fuchsia-400/[0.07]" : "bg-cyan-400/[0.07]";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050816] px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/3 top-1/4 h-96 w-96 rounded-full bg-[#00e5ff]/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 h-96 w-96 rounded-full bg-[#7c4dff]/6 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <BrandLogo variant="full" />
        </div>

        {isMock && (
          <div className="mb-4 rounded-[1.1rem] border border-amber-400/20 bg-amber-400/[0.07] px-4 py-2 text-xs text-amber-200">
            Test mode — no real charge was made
          </div>
        )}

        <div className={`rounded-[2rem] border ${tierBorder} ${tierBg} p-8`}>
          <div className="mb-4 flex justify-center">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full border ${tierBorder} bg-white/5`}>
              <svg className={`h-8 w-8 ${tierColor}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-semibold text-white">
            Welcome to <span className={tierColor}>{tierLabel}</span>
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Your membership is active. You now have access to early drops, exclusive tracks, and everything the {tierLabel} tier unlocks.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/radio"
              className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-6 py-3 text-sm font-bold text-white shadow-[0_0_22px_rgba(0,229,255,0.28)] transition hover:shadow-[0_0_32px_rgba(0,229,255,0.45)]"
            >
              Start listening
            </Link>
            <Link
              href="/membership"
              className="inline-flex items-center justify-center rounded-full border border-white/10 px-6 py-3 text-sm text-slate-400 transition hover:border-white/20 hover:text-white"
            >
              Manage membership
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
