"use client";

import Link from "next/link";

export default function ArtistsError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="rounded-[2rem] border border-fuchsia-400/18 bg-[linear-gradient(180deg,rgba(20,18,39,0.92),rgba(7,17,31,0.98))] p-8 shadow-[0_24px_84px_rgba(0,0,0,0.38)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-fuchsia-200/75">
          Artist directory unavailable
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white">
          The artist archive is reloading.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
          FlowSoundz is still online, but the artist directory hit a temporary loading issue.
          Browse the station catalog or jump back into radio while we restore the full profiles.
        </p>
        {process.env.NODE_ENV === "development" ? (
          <p className="mt-4 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-xs leading-6 text-slate-400">
            {error.message}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_18px_rgba(0,229,255,0.32)] transition hover:shadow-[0_0_28px_rgba(0,229,255,0.52)]"
          >
            Retry artist directory
          </button>
          <Link
            href="/songs"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/12 px-6 py-2.5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.05]"
          >
            Browse catalog
          </Link>
          <Link
            href="/radio"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-cyan-300/18 bg-cyan-300/10 px-6 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/[0.16]"
          >
            Return to radio
          </Link>
        </div>
      </div>
    </section>
  );
}
