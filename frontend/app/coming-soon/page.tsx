import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coming Soon — FlowSoundz Radio",
  description: "FlowSoundz Radio is launching soon. Underground music, curated.",
};

export default function ComingSoonPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050816] px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/3 top-1/4 h-96 w-96 rounded-full bg-[#00e5ff]/6 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 h-96 w-96 rounded-full bg-[#7c4dff]/7 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 text-center">
        <Image
          src="/FSRLogo.svg"
          alt="FlowSoundz Radio"
          width={180}
          height={28}
          className="h-7 w-auto"
          style={{ mixBlendMode: "screen", filter: "brightness(1.3) drop-shadow(0 0 8px rgba(0,230,255,0.3))" }}
        />

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-300/70">
            Coming soon
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
            Underground music.<br />Curated.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-7 text-slate-400">
            FlowSoundz Radio is almost ready. We&apos;re putting the final touches on the station before opening the doors.
          </p>
        </div>

        <a
          href="https://www.instagram.com/flowsoundzradio"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-white/22 hover:text-white"
        >
          Follow @flowsoundzradio
        </a>
      </div>
    </div>
  );
}
