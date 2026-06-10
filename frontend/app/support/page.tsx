import { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Support the Station | FlowSoundz Radio",
  description: "Help keep FlowSoundz Radio independent, ad-free, and artist-first. Support us via Ko-fi or Patreon.",
};

export default function SupportPage() {
  const kofiUrl = process.env.NEXT_PUBLIC_KOFI_URL || "#";
  const patreonUrl = process.env.NEXT_PUBLIC_PATREON_URL || "#";

  return (
    <AppShell eyebrow="Support Us" title="Fuel the Underground">
      <div className="relative min-h-screen bg-[#07070f] text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-[#00E5FF]/5 blur-[100px]" />
          <div className="absolute top-1/2 right-1/2 h-[500px] w-[500px] rounded-full bg-[#FF2DA6]/5 blur-[100px]" />
          <div className="absolute bottom-0 right-0 h-[600px] w-[600px] rounded-full bg-[#00FF88]/5 blur-[100px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-4 py-12 md:py-20">
          {/* Hero */}
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
              Independent Radio
            </p>
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight md:text-6xl">
              Keep the{" "}
              <span className="bg-[linear-gradient(135deg,#00e5ff,#7c4dff)] bg-clip-text text-transparent">
                Flow Alive
              </span>
            </h1>
            <p className="text-base leading-relaxed text-white/70 md:text-lg">
              FlowSoundz is completely independent, listener-supported radio. We bypass corporate curation to bring you authentic sounds, live sets, and unreleased gems directly from the underground.
            </p>
          </div>

          {/* Cards */}
          <div className="mb-20 grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Ko-fi */}
            <div className="glass-card relative flex flex-col justify-between overflow-hidden rounded-[1.8rem] border border-white/8 bg-[#07111f] p-6">
              <div>
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#00E5FF]/20 bg-[#00E5FF]/10 text-[#00E5FF]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
                    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
                    <line x1="6" x2="14" y1="2" y2="2" />
                  </svg>
                </div>
                <h2 className="mb-3 text-2xl font-bold text-white">Buy us a coffee</h2>
                <p className="mb-8 text-sm leading-relaxed text-white/70">
                  Perfect for quick, one-time support. Drop a tip to help us cover server costs, keep our stream bitrate pristine, and keep the broadcast running through the night.
                </p>
              </div>
              <div className="pt-4">
                <Link
                  href={kofiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-7 py-3 text-sm font-bold text-white shadow-[0_0_22px_rgba(0,229,255,0.35)] transition hover:shadow-[0_0_36px_rgba(0,229,255,0.55)] md:w-auto"
                >
                  Support via Ko-fi
                </Link>
              </div>
            </div>

            {/* Patreon */}
            <div className="glass-card relative flex flex-col justify-between overflow-hidden rounded-[1.8rem] border border-white/8 bg-[#07111f] p-6">
              <div>
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#FF2DA6]/20 bg-[#FF2DA6]/10 text-[#FF2DA6]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
                  </svg>
                </div>
                <h2 className="mb-3 text-2xl font-bold text-white">Become a Patron</h2>
                <p className="mb-8 text-sm leading-relaxed text-white/70">
                  Join our monthly membership community. Unlock exclusive perks including early access to tracklists, high-quality archive downloads, behind-the-scenes content, and voting rights on special broadcast events.
                </p>
              </div>
              <div className="pt-4">
                <Link
                  href={patreonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#FF2DA6_0%,#7c4dff_100%)] px-7 py-3 text-sm font-bold text-white shadow-[0_0_22px_rgba(255,45,166,0.35)] transition hover:shadow-[0_0_36px_rgba(255,45,166,0.55)] md:w-auto"
                >
                  Join the Patreon
                </Link>
              </div>
            </div>
          </div>

          {/* Perks */}
          <div className="mb-20 text-center">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
              Where your support goes
            </p>
            <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 text-left sm:grid-cols-3">
              <div className="rounded-2xl border border-white/8 bg-[#07111f]/40 p-5 backdrop-blur-sm">
                <div className="mb-2 text-lg font-bold text-[#00FF88]">01</div>
                <h3 className="mb-1 font-semibold text-white">Keep the station independent</h3>
                <p className="text-xs text-white/60">No boardrooms, no corporate sponsors, absolute creative freedom.</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-[#07111f]/40 p-5 backdrop-blur-sm">
                <div className="mb-2 text-lg font-bold text-[#00E5FF]">02</div>
                <h3 className="mb-1 font-semibold text-white">Fund artist payouts</h3>
                <p className="text-xs text-white/60">Enabling us to pay resident DJs, guest mixers, and underground creators fairly.</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-[#07111f]/40 p-5 backdrop-blur-sm">
                <div className="mb-2 text-lg font-bold text-[#FF2DA6]">03</div>
                <h3 className="mb-1 font-semibold text-white">Help us license more music</h3>
                <p className="text-xs text-white/60">Expanding our legal broadcast library with direct compliance and licensing.</p>
              </div>
            </div>
          </div>

          {/* Closing */}
          <div className="mx-auto max-w-xl border-t border-white/8 pt-8 text-center">
            <p className="text-sm font-medium tracking-wide text-white/80">
              Every dollar keeps <span className="text-[#00E5FF]">FlowSoundz</span> ad-free and artist-first.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
