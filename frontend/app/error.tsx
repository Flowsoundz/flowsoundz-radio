"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050816] px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/3 top-1/4 h-96 w-96 rounded-full bg-red-500/5 blur-[120px]" />
      </div>
      <div className="relative z-10 w-full max-w-sm text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-red-400/80">
          Something went wrong
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-white">Unexpected error</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          We hit an unexpected error. The team has been notified.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-6 py-3 text-sm font-bold text-white shadow-[0_0_22px_rgba(0,229,255,0.28)] transition hover:shadow-[0_0_32px_rgba(0,229,255,0.45)]"
          >
            Try again
          </button>
          <Link
            href="/radio"
            className="inline-flex items-center justify-center rounded-full border border-white/10 px-6 py-3 text-sm text-slate-400 transition hover:border-white/20 hover:text-white"
          >
            Back to radio
          </Link>
        </div>
      </div>
    </div>
  );
}
