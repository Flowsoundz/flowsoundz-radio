"use client";

import { useState } from "react";

export type ReleaseSubmission = {
  submission_id: string;
  artist_name: string;
  track_title: string;
  genre: string;
  release_date: string;
  email: string;
  notes?: string | null;
  production_method?: string | null;
  audio_file?: string;
  cover_file?: string;
  created_at: string;
  status: string;
  internal_notes?: string | null;
  ai_summary?: string | null;
  ai_tags?: string[] | null;
  ai_recommendation?: string | null;
  ai_confidence?: string | null;
  ai_generated_at?: string | null;
  ai_model?: string | null;
};

type AdminReleaseSubmissionsReviewProps = {
  submissions: ReleaseSubmission[];
};

const STATUS_OPTIONS = [
  { value: "received", label: "Received" },
  { value: "reviewed", label: "Reviewed" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function statusStyle(status: string): string {
  switch (status) {
    case "approved":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
    case "rejected":
      return "border-rose-400/20 bg-rose-400/10 text-rose-200";
    case "reviewed":
      return "border-cyan-300/20 bg-cyan-300/10 text-cyan-200";
    default:
      return "border-amber-300/20 bg-amber-300/10 text-amber-200";
  }
}

function statusLabel(status: string): string {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
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

export function AdminReleaseSubmissionsReview({
  submissions: initial,
}: AdminReleaseSubmissionsReviewProps) {
  const [submissions, setSubmissions] = useState(initial);
  const [selectedId, setSelectedId] = useState(initial[0]?.submission_id ?? "");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(initial[0]?.status ?? "received");
  const [notes, setNotes] = useState(initial[0]?.internal_notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selected =
    submissions.find((submission) => submission.submission_id === selectedId) ?? null;

  function select(submission: ReleaseSubmission) {
    setSelectedId(submission.submission_id);
    setStatus(submission.status);
    setNotes(submission.internal_notes ?? "");
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

      const response = await fetch("/api/admin/release-submissions", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; submission?: ReleaseSubmission }
        | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to save.");
      }

      setSubmissions((current) =>
        current.map((submission) =>
          submission.submission_id === selectedId
            ? { ...submission, ...(data?.submission ?? {}), status, internal_notes: notes || null }
            : submission,
        ),
      );

      setSaveStatus(
        `Saved — ${selected?.artist_name ?? selectedId} · ${statusLabel(status)}`,
      );
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleGenerateAiSummary() {
    if (!password) {
      setSaveError("Enter the admin password.");
      return;
    }

    if (!selectedId) {
      setSaveError("No submission selected.");
      return;
    }

    setIsGeneratingAi(true);
    setSaveStatus(null);
    setSaveError(null);

    try {
      const formData = new FormData();
      formData.append("action", "generate_ai_summary");
      formData.append("password", password);
      formData.append("submissionId", selectedId);
      formData.append("status", status);
      formData.append("internalNotes", notes);

      const response = await fetch("/api/admin/release-submissions", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; submission?: ReleaseSubmission }
        | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to generate AI summary.");
      }

      if (data?.submission) {
        setSubmissions((current) =>
          current.map((submission) =>
            submission.submission_id === selectedId ? data.submission! : submission,
          ),
        );
      }

      setSaveStatus(
        `AI summary ready — ${selected?.artist_name ?? selectedId}`,
      );
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to generate AI summary.",
      );
    } finally {
      setIsGeneratingAi(false);
    }
  }

  if (submissions.length === 0) {
    return (
      <div className="glass-card rounded-[1.8rem] p-6 text-sm leading-6 text-slate-300">
        No release submissions yet. They will appear here after artists submit
        via <span className="font-mono text-cyan-300">/artist/release-submit</span>.
      </div>
    );
  }

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
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="glass-card rounded-[1.8rem] p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#CBD5E1]/60">
              Release submissions
            </p>
            <span className="rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-[10px] font-medium text-[#CBD5E1]">
              {submissions.length} total
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {submissions.map((submission) => (
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
                      {submission.track_title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[#CBD5E1]">
                      {submission.artist_name}
                    </p>
                  </div>
                  <span
                    className={`mt-0.5 shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusStyle(submission.status)}`}
                  >
                    {statusLabel(submission.status)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-[#CBD5E1]/50">
                  <span>{submission.genre || "Genre pending"}</span>
                  <span>·</span>
                  <span>{formatDate(submission.created_at)}</span>
                </div>
              </button>
            ))}
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
                  {selected.track_title}
                </h2>
                <p className="mt-1 text-sm text-[#CBD5E1]">
                  {selected.artist_name}
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] divide-y divide-white/6">
                {[
                  { label: "Genre", value: selected.genre || "Not provided" },
                  { label: "Release date", value: selected.release_date || "Not provided" },
                  { label: "Production", value: selected.production_method === "ai_assisted" ? "AI-assisted (human creative)" : selected.production_method === "ai_generated" ? "AI-generated" : "Self-produced" },
                  { label: "Email", value: selected.email },
                  { label: "Submitted", value: formatDate(selected.created_at) },
                  { label: "Audio file", value: selected.audio_file || "Not uploaded" },
                  { label: "Cover file", value: selected.cover_file || "Not uploaded" },
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

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#CBD5E1]/55">
                  Artist notes
                </p>
                <p className="mt-2 rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-[#CBD5E1]">
                  {selected.notes || (
                    <span className="text-[#CBD5E1]/35">No notes provided.</span>
                  )}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#CBD5E1]/55">
                    AI curator summary
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleGenerateAiSummary()}
                    disabled={isGeneratingAi || !password}
                    className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-fuchsia-100 transition hover:border-fuchsia-300/35 hover:bg-fuchsia-400/16 disabled:opacity-50"
                  >
                    {isGeneratingAi ? "Generating..." : selected.ai_summary ? "Regenerate AI" : "Generate AI"}
                  </button>
                </div>

                <div className="mt-2 rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                  {selected.ai_summary ? (
                    <div className="space-y-3 text-sm text-[#CBD5E1]">
                      <p className="leading-6">{selected.ai_summary}</p>
                      <div className="flex flex-wrap gap-2">
                        {(selected.ai_tags ?? []).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-cyan-300/16 bg-cyan-300/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#CBD5E1]/70">
                        <span>Recommendation: {selected.ai_recommendation || "—"}</span>
                        <span>Confidence: {selected.ai_confidence || "—"}</span>
                        {selected.ai_generated_at ? (
                          <span>Generated: {formatDate(selected.ai_generated_at)}</span>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[#CBD5E1]/35">
                      No AI summary generated yet.
                    </p>
                  )}
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200">
                    Review status
                  </label>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
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
                    placeholder="Follow-up actions, fit notes, release considerations..."
                    className="mt-2 w-full rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-[#CBD5E1]/35 focus:border-cyan-300/35"
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
