import Link from "next/link";

export function SupportBanner() {
  const kofiUrl = process.env.NEXT_PUBLIC_KOFI_URL || "#";
  const patreonUrl = process.env.NEXT_PUBLIC_PATREON_URL || "#";

  return (
    <div className="glass-card flex w-full flex-col items-center justify-between gap-4 rounded-[1.8rem] border border-white/8 bg-[#07111f] p-6 sm:flex-row">
      <div className="flex items-center gap-3 text-center sm:text-left">
        <span className="hidden h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#00FF88] sm:inline-block" />
        <p className="text-sm font-medium tracking-wide text-white">
          Keep FlowSoundz independent —
        </p>
      </div>
      <div className="flex w-full items-center justify-center gap-3 sm:w-auto">
        <Link
          href={kofiUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-1/2 items-center justify-center rounded-full bg-[#00E5FF] px-5 py-1.5 text-xs font-bold tracking-wide text-[#07070f] shadow-[0_0_14px_rgba(0,229,255,0.25)] transition hover:bg-[#00E5FF]/90 hover:shadow-[0_0_22px_rgba(0,229,255,0.45)] sm:w-auto"
        >
          Ko-fi
        </Link>
        <Link
          href={patreonUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-1/2 items-center justify-center rounded-full bg-[#FF2DA6] px-5 py-1.5 text-xs font-bold tracking-wide text-white shadow-[0_0_14px_rgba(255,45,166,0.25)] transition hover:bg-[#FF2DA6]/90 hover:shadow-[0_0_22px_rgba(255,45,166,0.45)] sm:w-auto"
        >
          Patreon
        </Link>
      </div>
    </div>
  );
}
