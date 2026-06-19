import Link from "next/link";
import { auth } from "@/auth";
import {
  getCreatorDashboard,
  type CreatorDashboard,
  type CreatorTrackStatus,
} from "@/lib/creatorDashboard";

const STATUS: Record<CreatorTrackStatus, { label: string; cls: string }> = {
  live: { label: "● Live", cls: "border-[#00FF88]/30 bg-[#00FF88]/10 text-[#00FF88]" },
  priority_review: { label: "Priority review", cls: "border-[#FF2DA6]/30 bg-[#FF2DA6]/10 text-[#FF2DA6]" },
  in_review: { label: "In review", cls: "border-amber-300/30 bg-amber-300/10 text-amber-200" },
  processing: { label: "Mastering", cls: "border-cyan-300/30 bg-cyan-300/10 text-cyan-200" },
  not_selected: { label: "Not selected", cls: "border-white/15 bg-white/5 text-slate-400" },
};

function Stat({ value, label, accent }: { value: string | number; label: string; accent: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-4">
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">{label}</p>
    </div>
  );
}

// The artist's personalized HQ — renders only for signed-in artists who have
// submitted at least one track. Returns null otherwise so the dashboard shows
// its onboarding view for new/anonymous visitors. Pass `data` to reuse a
// dashboard query already made by the page (avoids a duplicate fetch).
export async function CreatorCommandCenter({ data: provided }: { data?: CreatorDashboard | null } = {}) {
  let data = provided;
  if (data === undefined) {
    const session = await auth();
    if (!session?.user?.email) return null;
    data = await getCreatorDashboard(session.user.email);
  }
  if (!data) return null;

  return (
    <section className="mb-10 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">Your Music HQ</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">Welcome back, {data.artistName}</h2>
        </div>
        {data.nextAction ? (
          <div className="max-w-sm text-right">
            <Link
              href={data.nextAction.href}
              className="rounded-full bg-gradient-to-r from-[#00e5ff] to-[#7c4dff] px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
            >
              {data.nextAction.label} →
            </Link>
            <p className="mt-2 text-xs leading-5 text-slate-400">{data.nextAction.description}</p>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={data.totals.plays} label="Total plays" accent="text-[#00e5ff]" />
        <Stat value={data.totals.fires} label="🔥 Fires" accent="text-[#FF2DA6]" />
        <Stat value={data.totals.liveTracks} label="Live tracks" accent="text-[#00FF88]" />
        <Stat value={data.totals.bestRank ?? "—"} label="Best rotation rank" accent="text-violet-300" />
      </div>

      {data.spotlightTrack ? (
        <div className="rounded-[1.8rem] border border-cyan-300/14 bg-[linear-gradient(135deg,rgba(0,229,255,0.07),rgba(124,77,255,0.05))] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/80">
            Current station outcome
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">{data.spotlightTrack.title}</h3>
              <p className="mt-1 text-sm text-slate-300">
                {data.spotlightTrack.status === "live"
                  ? data.spotlightTrack.nextAiring
                    ? `Next airing: ${data.spotlightTrack.nextAiring}`
                    : "Live in the station catalog now."
                  : data.spotlightTrack.status === "priority_review"
                    ? "Priority review is active. Watch for the next curator update."
                    : "This release is the closest track to the next station decision."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-200">
              {data.spotlightTrack.status === "live" ? (
                <>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{data.spotlightTrack.plays} plays</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">🔥 {data.spotlightTrack.fires}</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">rank {Math.round(data.spotlightTrack.rotationScore)}</span>
                </>
              ) : (
                <Link
                  href="/artist/submissions"
                  className="rounded-full border border-cyan-300/18 bg-cyan-300/[0.10] px-4 py-2 font-semibold text-cyan-100 transition hover:bg-cyan-300/[0.15]"
                >
                  Open submission status →
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-[1.8rem] border border-white/8 bg-[#0B1020]/70 p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-white/40">Your Tracks</p>
        <ul className="space-y-2.5">
          {data.tracks.map((t) => {
            const s = STATUS[t.status];
            return (
              <li key={t.submissionId} className="rounded-[1.2rem] border border-white/8 bg-white/[0.02] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-semibold text-white">{t.title}</p>
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${s.cls}`}>
                    {s.label}
                  </span>
                </div>
                {t.status === "live" ? (
                  <>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                      <span>{t.plays} plays</span>
                      <span>🔥 {t.fires}</span>
                      <span>♥ {t.favorites}</span>
                      <span>rank {Math.round(t.rotationScore)}</span>
                      {t.nextAiring ? <span className="text-[#00FF88]">next: {t.nextAiring}</span> : null}
                    </div>
                    <Link
                      href={`/visualizer?artist=${encodeURIComponent(data.artistName)}&track=${encodeURIComponent(t.title)}`}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300 transition hover:text-cyan-200"
                    >
                      🎬 Make a promo video →
                    </Link>
                  </>
                ) : t.status === "in_review" && !t.reviewPaid ? (
                  <p className="mt-2 text-[11px] text-slate-400">
                    In the review queue.{" "}
                    <Link href="/artist/confirmation" className="text-[#FF2DA6] hover:underline">
                      Get priority review →
                    </Link>
                  </p>
                ) : t.status === "priority_review" ? (
                  <p className="mt-2 text-[11px] text-[#FF2DA6]">Priority review — feedback within 48h.</p>
                ) : t.status === "processing" ? (
                  <p className="mt-2 text-[11px] text-cyan-200/80">Approved — mastering now, on air shortly.</p>
                ) : null}
              </li>
            );
          })}
        </ul>
        <Link
          href="/artist/submit"
          className="mt-4 inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white transition hover:border-white/22"
        >
          + Submit another track
        </Link>
      </div>
    </section>
  );
}
