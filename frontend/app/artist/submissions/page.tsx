"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { CreatorHubShell } from "@/components/creator-hub/CreatorHubShell";

type Submission = {
  submission_id: string;
  created_at: string;
  updated_at: string;
  status: "new" | "reviewing" | "approved" | "rejected";
  artist_name: string;
  song_title: string;
  genre: string;
  vibe: string;
  artist_feedback?: string | null;
  review_paid: boolean;
  song_id: string | null;
  plays: number;
  fires: number;
  favorites: number;
  requests: number;
  rotation_score: number;
  next_airing: string | null;
};

const STATUS_CONFIG = {
  new: {
    label: "In Queue",
    cls: "border-amber-400/25 bg-amber-400/10 text-amber-200",
    dot: "bg-amber-400",
  },
  reviewing: {
    label: "Under Review",
    cls: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
    dot: "bg-cyan-400",
  },
  approved: {
    label: "Approved",
    cls: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    dot: "bg-emerald-400",
  },
  rejected: {
    label: "Not Selected",
    cls: "border-red-400/25 bg-red-400/10 text-red-300",
    dot: "bg-red-400",
  },
} as const;

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

type Stage = { label: string; state: "done" | "active" | "pending" | "bad" };

// Visual pipeline so artists always know where a track stands — the
// transparency that makes the curated (and paid-priority) review worth trusting.
function SubmissionTimeline({ status }: { status: Submission["status"] }) {
  let stages: Stage[];
  if (status === "rejected") {
    stages = [
      { label: "Submitted", state: "done" },
      { label: "Reviewed", state: "done" },
      { label: "Not selected", state: "bad" },
    ];
  } else {
    // current active stage index along Submitted → In Review → Approved → On Air
    const current = status === "approved" ? 3 : 1;
    stages = ["Submitted", "In Review", "Approved", "On Air"].map((label, i) => ({
      label,
      state: i < current ? "done" : i === current ? "active" : "pending",
    }));
  }

  return (
    <div className="flex items-start">
      {stages.map((st, i) => (
        <Fragment key={st.label}>
          <div className="flex min-w-0 flex-col items-center gap-1.5" style={{ flex: "0 0 auto" }}>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold ${
                st.state === "done"
                  ? "border-[#00FF88]/40 bg-[#00FF88]/15 text-[#00FF88]"
                  : st.state === "active"
                    ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-200 shadow-[0_0_10px_rgba(0,229,255,0.3)]"
                    : st.state === "bad"
                      ? "border-red-400/40 bg-red-400/15 text-red-300"
                      : "border-white/15 text-white/35"
              }`}
            >
              {st.state === "done" ? "✓" : st.state === "bad" ? "✕" : i + 1}
            </span>
            <span
              className={`whitespace-nowrap text-[10px] font-medium ${
                st.state === "pending" ? "text-white/35" : st.state === "bad" ? "text-red-300" : "text-slate-300"
              }`}
            >
              {st.label}
            </span>
          </div>
          {i < stages.length - 1 && (
            <span
              className={`mt-3 h-px flex-1 ${
                stages[i].state === "done" ? "bg-[#00FF88]/30" : "bg-white/10"
              }`}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}

function StationOutcomeCard({ submission }: { submission: Submission }) {
  if (submission.status === "approved" && submission.song_id) {
    return (
      <div className="rounded-[1rem] border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300 mb-1">
          Station outcome
        </p>
        <p className="text-sm text-slate-100">
          This track is approved and connected to the station catalog.
          {submission.next_airing ? ` Next airing: ${submission.next_airing}.` : " Rotation timing will appear here once the next block is resolved."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
            {submission.plays.toLocaleString()} plays
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
            {submission.fires.toLocaleString()} fires
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
            {submission.requests.toLocaleString()} requests
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
            rank {Math.round(submission.rotation_score)}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            href="/radio"
            className="inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/16"
          >
            Hear the station →
          </Link>
        </div>
      </div>
    );
  }

  if (submission.status === "reviewing" && submission.review_paid) {
    return (
      <div className="rounded-[1rem] border border-cyan-400/20 bg-cyan-400/[0.07] px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300 mb-1">
          Review lane
        </p>
        <p className="text-sm text-slate-200">
          Priority review is active on this submission. The next creator-side update will appear here before the track reaches rotation.
        </p>
      </div>
    );
  }

  if (submission.status === "rejected") {
    return (
      <div className="rounded-[1rem] border border-red-400/20 bg-red-400/[0.06] px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-300 mb-1">
          Station outcome
        </p>
        <p className="text-sm text-slate-200">
          This track did not enter the current rotation. Use the feedback, tighten the package, and submit the next release when it is ready.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[1rem] border border-white/8 bg-white/[0.03] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45 mb-1">
        What happens next
      </p>
      <p className="text-sm text-slate-300">
        Once review is complete, FlowSoundz will show whether the track moved into rotation, what its first station outcome was, and when listeners can expect to hear it next.
      </p>
    </div>
  );
}

export default function MySubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/artist/my-submissions")
      .then((r) => {
        if (r.status === 401) throw new Error("not_authed");
        return r.json();
      })
      .then((data: { submissions: Submission[] }) => setSubmissions(data.submissions))
      .catch((e: Error) => {
        if (e.message === "not_authed") {
          window.location.href = "/signin?next=/artist/submissions";
        } else {
          setError("Could not load submissions. Try again.");
        }
      });
  }, []);

  return (
    <CreatorHubShell eyebrow="Creator Hub" title="My Submissions">
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-sm text-slate-400">
          Tracks you&apos;ve submitted for FlowSoundz Radio curation review.
        </p>
        <Link
          href="/artist/submit"
          className="inline-flex min-h-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-5 py-2 text-sm font-bold text-white shadow-[0_0_18px_rgba(0,229,255,0.25)] transition hover:shadow-[0_0_28px_rgba(0,229,255,0.4)]"
        >
          + Submit track
        </Link>
      </div>

      {error && (
        <div className="rounded-[1.2rem] border border-red-400/20 bg-red-400/[0.07] px-5 py-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {!submissions && !error && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-[1.4rem] border border-white/5 bg-white/[0.03]"
            />
          ))}
        </div>
      )}

      {submissions && submissions.length === 0 && (
        <div className="rounded-[1.9rem] border border-white/8 bg-[#0B1020]/80 px-8 py-12 text-center">
          <p className="text-sm font-semibold text-white">No submissions yet</p>
          <p className="mt-2 text-sm text-slate-500">
            Submit your first track for curation review.
          </p>
          <Link
            href="/artist/submit"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-6 py-3 text-sm font-bold text-white"
          >
            Submit a track
          </Link>
        </div>
      )}

      {submissions && submissions.length > 0 && (
        <div className="flex flex-col gap-3">
          {submissions.map((s) => {
            const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.new;
            return (
              <div
                key={s.submission_id}
                className="flex flex-col gap-3 rounded-[1.4rem] border border-white/8 bg-[#0B1020]/80 px-5 py-4"
              >
                <div className="flex flex-col gap-1">
                  <p className="font-semibold text-white leading-snug">
                    &ldquo;{s.song_title}&rdquo;
                  </p>
                  <p className="text-sm text-slate-400">
                    {s.artist_name}
                    {s.genre ? ` · ${s.genre}` : ""}
                    {s.vibe ? ` · ${s.vibe}` : ""}
                  </p>
                  <p className="text-xs text-slate-600">
                    Submitted {formatDate(s.created_at)}
                    {s.updated_at !== s.created_at
                      ? ` · Updated ${formatDate(s.updated_at)}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cfg.cls}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                </div>
                <div className="border-t border-white/[0.06] pt-3">
                  <SubmissionTimeline status={s.status} />
                </div>
                <StationOutcomeCard submission={s} />
                {s.artist_feedback ? (
                  <div className="rounded-[1rem] border border-[#7c4dff]/20 bg-[#7c4dff]/[0.06] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a78bfa] mb-1">Feedback from FlowSoundz</p>
                    <p className="text-sm leading-6 text-slate-200">{s.artist_feedback}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {submissions && submissions.length > 0 && (
        <p className="mt-4 text-center text-xs text-slate-600">
          Status updates are sent to your submission email.
        </p>
      )}
    </CreatorHubShell>
  );
}
