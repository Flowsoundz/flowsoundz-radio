"use client";

import { useEffect, useState } from "react";
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
                className="flex flex-col gap-3 rounded-[1.4rem] border border-white/8 bg-[#0B1020]/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
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
                <div className="shrink-0">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cfg.cls}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                </div>
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
