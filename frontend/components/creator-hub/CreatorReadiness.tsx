import Link from "next/link";
import { auth } from "@/auth";
import { getCreatorReadiness } from "@/lib/creatorReadiness";

// Creator readiness card — shows for signed-in artists. When the profile is
// fully set up it collapses to a single confirmation line; otherwise it shows
// the score + the remaining one-tap fixes.
export async function CreatorReadiness() {
  const session = await auth();
  if (!session?.user?.email) return null;
  const data = await getCreatorReadiness(session.user.email);
  if (!data) return null;

  const remaining = data.items.filter((it) => !it.done);

  if (data.complete) {
    return (
      <div className="mb-6 flex items-center gap-2.5 rounded-[1.4rem] border border-[#00FF88]/25 bg-[#00FF88]/[0.07] px-5 py-3">
        <span className="text-[#00FF88]">✓</span>
        <p className="text-sm font-semibold text-[#00FF88]">Your creator profile is complete</p>
        <span className="ml-auto text-[11px] text-slate-400">100/100</span>
      </div>
    );
  }

  return (
    <section className="mb-6 rounded-[1.8rem] border border-white/8 bg-[#0B1020]/70 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">Creator readiness</p>
          <p className="mt-1 text-sm text-slate-400">
            Complete your profile so your shared page converts and earnings can pay out.
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold leading-none text-white">
            {data.score}
            <span className="text-base text-slate-500">/100</span>
          </p>
        </div>
      </div>

      {/* progress bar */}
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#00e5ff,#7c4dff)] transition-all"
          style={{ width: `${data.score}%` }}
        />
      </div>

      {/* remaining items */}
      <ul className="mt-4 space-y-2">
        {remaining.map((it) => (
          <li
            key={it.id}
            className="flex flex-col gap-2 rounded-[1.1rem] border border-white/8 bg-white/[0.02] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">
                <span className="mr-2 inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-white/25 align-middle" />
                {it.label}
              </p>
              <p className="mt-0.5 pl-[22px] text-[11px] text-slate-500">{it.hint}</p>
            </div>
            <Link
              href={it.href}
              className="shrink-0 self-start rounded-full border border-cyan-400/25 bg-cyan-400/[0.06] px-3.5 py-1.5 text-xs font-semibold text-cyan-300 transition hover:border-cyan-400/40 hover:text-cyan-200 sm:self-auto"
            >
              {it.cta} →
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
