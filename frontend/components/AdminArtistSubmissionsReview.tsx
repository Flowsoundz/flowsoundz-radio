"use client";

import { useState } from "react";
import type {
  ArtistSubmissionRecord,
  ArtistSubmissionStatus,
} from "@/lib/artistSubmissionStore";

type AdminArtistSubmissionsReviewProps = {
  submissions: ArtistSubmissionRecord[];
};

const STATUS_OPTIONS: Array<{
  value: ArtistSubmissionStatus;
  label: string;
}> = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function statusStyle(status: ArtistSubmissionStatus): string {
  switch (status) {
    case "approved":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
    case "rejected":
      return "border-rose-400/20 bg-rose-400/10 text-rose-200";
    case "reviewing":
      return "border-cyan-300/20 bg-cyan-300/10 text-cyan-200";
    default:
      return "border-amber-300/20 bg-amber-300/10 text-amber-200";
  }
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function hasSavedPromoPreview(submission: ArtistSubmissionRecord): boolean {
  if (!submission.promo_updated_at) {
    return false;
  }

  const createdAt = new Date(submission.created_at).getTime();
  const promoUpdatedAt = new Date(submission.promo_updated_at).getTime();

  if (Number.isNaN(createdAt) || Number.isNaN(promoUpdatedAt)) {
    return false;
  }

  return promoUpdatedAt - createdAt > 1000;
}

export function AdminArtistSubmissionsReview({
  submissions: initial,
}: AdminArtistSubmissionsReviewProps) {
  const [submissions, setSubmissions] = useState(initial);
  const [statusFilter, setStatusFilter] = useState<ArtistSubmissionStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(initial[0]?.submission_id ?? "");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<ArtistSubmissionStatus>(
    initial[0]?.status ?? "new",
  );
  const [notes, setNotes] = useState(initial[0]?.internal_notes ?? "");
  const [feedback, setFeedback] = useState(initial[0]?.artist_feedback ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selected =
    submissions.find((submission) => submission.submission_id === selectedId) ?? null;
  const filteredSubmissions = submissions.filter((submission) => {
    const matchesStatus =
      statusFilter === "all" ? true : submission.status === statusFilter;
    const haystack = `${submission.song_title} ${submission.artist_name} ${submission.genre}`.toLowerCase();
    const matchesQuery =
      query.trim().length === 0
        ? true
        : haystack.includes(query.trim().toLowerCase());
    return matchesStatus && matchesQuery;
  });

  function select(submission: ArtistSubmissionRecord) {
    setSelectedId(submission.submission_id);
    setStatus(submission.status);
    setNotes(submission.internal_notes ?? "");
    setFeedback(submission.artist_feedback ?? "");
    setSaveStatus(null);
    setSaveError(null);
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!password) {
      setSaveError("Enter the admin password.");
      return;
    }

    if (!selectedId) {
      setSaveError("No submission selected.");
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);
    setSaveError(null);

    try {
      const formData = new FormData();
      formData.append("password", password);
      formData.append("submissionId", selectedId);
      formData.append("status", status);
      formData.append("internalNotes", notes);
      formData.append("artistFeedback", feedback);

      const response = await fetch("/api/admin/artist-submissions", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; submission?: ArtistSubmissionRecord }
        | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to save.");
      }

      setSubmissions((current) =>
        current.map((submission) =>
          submission.submission_id === selectedId
            ? data?.submission ?? submission
            : submission,
        ),
      );

      setSaveStatus(`Saved — ${selected?.artist_name ?? selectedId} · ${status}`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  }

  async function quickUpdate(nextStatus: ArtistSubmissionStatus) {
    if (!selected) {
      return;
    }

    setStatus(nextStatus);
    setIsSaving(true);
    setSaveStatus(null);
    setSaveError(null);

    try {
      const formData = new FormData();
      formData.append("password", password);
      formData.append("submissionId", selected.submission_id);
      formData.append("status", nextStatus);
      formData.append("internalNotes", notes);
      formData.append("artistFeedback", feedback);

      const response = await fetch("/api/admin/artist-submissions", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; submission?: ArtistSubmissionRecord }
        | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to save.");
      }

      setSubmissions((current) =>
        current.map((submission) =>
          submission.submission_id === selected.submission_id
            ? data?.submission ?? submission
            : submission,
        ),
      );
      setSaveStatus(`Saved — ${selected.artist_name} · ${nextStatus}`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  }

  if (submissions.length === 0) {
    return (
      <div className="glass-card rounded-[1.8rem] p-6 text-sm leading-6 text-slate-300">
        No artist submissions yet. They will appear here after artists submit
        through the Creator Hub.
      </div>
    );
  }

  const counts = submissions.reduce<Record<ArtistSubmissionStatus, number>>(
    (acc, submission) => {
      acc[submission.status] += 1;
      return acc;
    },
    { new: 0, reviewing: 0, approved: 0, rejected: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-[1.8rem] p-5">
        <label className="block text-sm font-medium text-slate-200">
          Admin password
        </label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter ADMIN_UPLOAD_PASSWORD"
          className="mt-3 w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
              statusFilter === "all"
                ? "border-white/18 bg-white/12 text-white"
                : "border-white/8 bg-white/5 text-[#CBD5E1]"
            }`}
          >
            All: {submissions.length}
          </button>
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatusFilter(option.value)}
              className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusStyle(option.value)}`}
            >
              {option.label}: {counts[option.value]}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by artist, song, or genre"
          className="mt-4 w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="glass-card rounded-[1.8rem] p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#CBD5E1]/60">
              Artist submissions
            </p>
            <span className="rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-[10px] font-medium text-[#CBD5E1]">
              {submissions.length} total
            </span>
          </div>

          <div className="mt-4 space-y-2">
              {filteredSubmissions.map((submission) => (
              <button
                key={submission.submission_id}
                type="button"
                onClick={() => select(submission)}
                className={`w-full rounded-[1.4rem] border p-4 text-left transition ${
                  submission.submission_id === selectedId
                    ? "border-cyan-300/25 bg-cyan-300/10"
                    : "border-white/8 bg-white/[0.03] hover:border-white/14 hover:bg-white/[0.06]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#F8FAFC]">
                      {submission.song_title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[#CBD5E1]">
                      {submission.artist_name}
                    </p>
                    {hasSavedPromoPreview(submission) ? (
                      <span className="mt-2 inline-flex rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-fuchsia-200">
                        Promo saved
                      </span>
                    ) : null}
                  </div>
                  <span
                    className={`mt-0.5 shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusStyle(submission.status)}`}
                  >
                    {submission.status}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-[#CBD5E1]/50">
                  <span>{submission.genre || "Genre pending"}</span>
                  <span>·</span>
                  <span>{submission.vibe || "Vibe pending"}</span>
                  <span>·</span>
                  <span>{formatDate(submission.created_at)}</span>
                </div>
              </button>
            ))}
            {filteredSubmissions.length === 0 ? (
              <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4 text-sm text-[#CBD5E1]/60">
                No submissions match the current filter.
              </div>
            ) : null}
          </div>
        </div>

        <div className="glass-card rounded-[1.8rem] p-5">
          {selected ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#CBD5E1]/50">
                  {selected.submission_id}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#F8FAFC]">
                  {selected.song_title}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="text-sm text-[#CBD5E1]">{selected.artist_name}</p>
                  {hasSavedPromoPreview(selected) ? (
                    <span className="inline-flex rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-fuchsia-200">
                      Promo saved
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] divide-y divide-white/6">
                {[
                  { label: "Genre", value: selected.genre || "Not provided" },
                  { label: "Vibe", value: selected.vibe || "Not provided" },
                  { label: "Artist type", value: selected.artist_type || "Not provided" },
                  { label: "Contact", value: selected.contact_name || "Not provided" },
                  { label: "Email", value: selected.email },
                  { label: "Version", value: selected.version_type || "Not provided" },
                  { label: "Producer", value: selected.producer_credit || "Not provided" },
                  { label: "Song link", value: selected.song_link || "Not provided" },
                  { label: "Platform link", value: selected.streaming_link || "Not provided" },
                  { label: "Social", value: selected.social_link || "Not provided" },
                  { label: "Submitted", value: formatDate(selected.created_at) },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <span className="text-[#CBD5E1]/55">{row.label}</span>
                    <span className="max-w-[60%] truncate font-medium text-[#F8FAFC]">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#CBD5E1]/55">
                    Submission notes
                  </p>
                  <p className="mt-2 rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-[#CBD5E1]">
                    {selected.description || (
                      <span className="text-[#CBD5E1]/35">No description provided.</span>
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#CBD5E1]/55">
                    Permissions
                  </p>
                  <div className="mt-2 rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-[#CBD5E1]">
                    <p>Rights to recording: {selected.rights_confirmed ? "Confirmed" : "Missing"}</p>
                    <p>Samples cleared: {selected.samples_confirmed ? "Confirmed" : "Missing"}</p>
                    <p>FlowSoundz streaming/promo permission: {selected.promotion_permission_confirmed ? "Confirmed" : "Missing"}</p>
                    <p>Removal policy acknowledged: {selected.removal_policy_confirmed ? "Confirmed" : "Missing"}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#CBD5E1]/55">
                  AI disclosure
                </p>
                <p className="mt-2 text-sm leading-6 text-[#CBD5E1]">
                  {selected.ai_used ? "AI used in the workflow." : "No AI disclosed."}
                </p>
                <p className="mt-1 text-sm text-[#CBD5E1]/70">
                  Tool: {selected.ai_tool || "Not provided"}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/70">
                    Artist Bio
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#CBD5E1]">
                    {selected.promo.bio}
                  </p>
                </div>
                <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fuchsia-200/70">
                    Promo Blurb
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#CBD5E1]">
                    {selected.promo.promoBlurb}
                  </p>
                  <p className="mt-3 text-xs text-[#CBD5E1]/70">
                    Suggested vibe: {selected.promo.suggestedVibe}
                  </p>
                  {hasSavedPromoPreview(selected) && selected.promo_updated_at ? (
                    <p className="mt-2 text-xs text-fuchsia-200/80">
                      Last finalized edit: {formatDate(selected.promo_updated_at)}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-200/70">
                  Radio Intro
                </p>
                <p className="mt-2 text-sm leading-6 text-[#CBD5E1]">
                  {selected.promo.radioIntro}
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-200/70">
                  Social Captions
                </p>
                <div className="mt-2 space-y-2 text-sm leading-6 text-[#CBD5E1]">
                  {(selected.promo.socialCaptions ?? []).map((caption, index) => (
                    <p key={`admin-caption-${index}`}>{caption}</p>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void quickUpdate("reviewing")}
                    disabled={isSaving || !password}
                    className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 disabled:opacity-40"
                  >
                    Mark Reviewing
                  </button>
                  <button
                    type="button"
                    onClick={() => void quickUpdate("approved")}
                    disabled={isSaving || !password}
                    className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200 disabled:opacity-40"
                  >
                    Quick Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => void quickUpdate("rejected")}
                    disabled={isSaving || !password}
                    className="rounded-full border border-rose-400/25 bg-rose-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-200 disabled:opacity-40"
                  >
                    Quick Reject
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-200">
                    Review status
                  </label>
                  <select
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as ArtistSubmissionStatus)
                    }
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                        className="bg-slate-950"
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200">
                    Internal notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={4}
                    placeholder="Fit notes, follow-up actions, rotation decision..."
                    className="mt-2 w-full rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-[#CBD5E1]/35 focus:border-cyan-300/35"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200">
                    Artist-facing feedback
                  </label>
                  <p className="mt-1 text-xs text-[#CBD5E1]/55">
                    Visible to the artist on their My Submissions page.
                  </p>
                  <textarea
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    rows={3}
                    placeholder="What made this stand out, or what we&apos;d like to see improved..."
                    className="mt-2 w-full rounded-[1.4rem] border border-[#7c4dff]/25 bg-[#7c4dff]/[0.05] px-4 py-3 text-sm text-white outline-none placeholder:text-[#CBD5E1]/35 focus:border-[#7c4dff]/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSaving || !password}
                  className="w-full rounded-2xl border border-cyan-100/70 bg-[linear-gradient(135deg,#67E8F9_0%,#22D3EE_45%,#06B6D4_100%)] px-4 py-3 text-sm font-bold text-slate-950 shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_12px_30px_rgba(34,211,238,0.35)] transition hover:-translate-y-0.5 disabled:border-white/8 disabled:bg-white/10 disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0"
                >
                  {isSaving ? "Saving..." : "Save review"}
                </button>

                {saveStatus ? (
                  <p className="text-sm text-emerald-300">{saveStatus}</p>
                ) : null}
                {saveError ? (
                  <p className="text-sm text-rose-300">{saveError}</p>
                ) : null}
              </form>
            </div>
          ) : (
            <p className="text-sm text-[#CBD5E1]/50">
              Select a submission from the list.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
