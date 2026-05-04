"use client";

import { useState } from "react";
import { formatVibeLabel } from "@/lib/format";

export type PromoSubmission = {
  submission_id: string;
  package_tier?: string;
  artist_name: string;
  song_title: string;
  email: string;
  vibe: string;
  message: string;
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

type AdminPromoReviewProps = {
  submissions: PromoSubmission[];
};

const STATUS_OPTIONS = [
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "featured", label: "Featured" },
  { value: "sponsored", label: "Sponsored" },
  { value: "rejected", label: "Rejected" },
];

function statusStyle(status: string): string {
  switch (status) {
    case "approved":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
    case "featured":
      return "border-cyan-300/20 bg-cyan-300/10 text-cyan-200";
    case "sponsored":
      return "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200";
    case "rejected":
      return "border-rose-400/20 bg-rose-400/10 text-rose-200";
    default:
      return "border-amber-300/20 bg-amber-300/10 text-amber-200";
  }
}

function statusLabel(status: string): string {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

function packageTierLabel(tier?: string): string {
  switch (tier) {
    case "featured":
      return "Featured";
    case "sponsored":
      return "Sponsored";
    case "basic":
    default:
      return "Basic";
  }
}

function formatDate(iso: string): string {
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

export function AdminPromoReview({
  submissions: initial,
}: AdminPromoReviewProps) {
  const [submissions, setSubmissions] = useState(initial);
  const [selectedId, setSelectedId] = useState(initial[0]?.submission_id ?? "");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(initial[0]?.status ?? "pending_review");
  const [notes, setNotes] = useState(initial[0]?.internal_notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selected = submissions.find((s) => s.submission_id === selectedId) ?? null;

  const pendingCount = submissions.filter(
    (s) => s.status === "pending_review",
  ).length;

  function select(sub: PromoSubmission) {
    setSelectedId(sub.submission_id);
    setStatus(sub.status);
    setNotes(sub.internal_notes ?? "");
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

      const response = await fetch("/api/admin/promo", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        submission?: PromoSubmission;
      } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to save.");
      }

      setSubmissions((current) =>
        current.map((sub) =>
          sub.submission_id === selectedId
            ? { ...sub, ...(data?.submission ?? {}), status, internal_notes: notes || null }
            : sub,
        ),
      );

      setSaveStatus(
        `Saved — ${selected?.artist_name ?? selectedId} · ${statusLabel(status)}`,
      );
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save.");
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

      const response = await fetch("/api/admin/promo", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        submission?: PromoSubmission;
      } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to generate AI summary.");
      }

      if (data?.submission) {
        setSubmissions((current) =>
          current.map((sub) =>
            sub.submission_id === selectedId ? data.submission! : sub,
          ),
        );
      }

      setSaveStatus(`AI summary ready — ${selected?.artist_name ?? selectedId}`);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to generate AI summary.",
      );
    } finally {
      setIsGeneratingAi(false);
    }
  }

  if (submissions.length === 0) {
    return (
      <div className="glass-card rounded-[1.8rem] p-6 text-sm leading-6 text-slate-300">
        No promo submissions yet. They will appear here after artists submit
        through the Promo page.
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
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter ADMIN_UPLOAD_PASSWORD"
          className="mt-3 w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        {/* Submission list */}
        <div className="glass-card rounded-[1.8rem] p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#CBD5E1]/60">
              Submissions
            </p>
            <div className="flex items-center gap-2">
              {pendingCount > 0 ? (
                <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-semibold text-amber-200">
                  {pendingCount} pending
                </span>
              ) : null}
              <span className="rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-[10px] font-medium text-[#CBD5E1]">
                {submissions.length} total
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {submissions.map((sub) => (
              <button
                key={sub.submission_id}
                type="button"
                onClick={() => select(sub)}
                className={`w-full rounded-[1.4rem] border p-4 text-left transition ${
                  sub.submission_id === selectedId
                    ? "border-cyan-300/25 bg-cyan-300/10"
                    : "border-white/8 bg-white/[0.03] hover:border-white/14 hover:bg-white/[0.06]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#F8FAFC]">
                      {sub.song_title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[#CBD5E1]">
                      {sub.artist_name}
                    </p>
                  </div>
                  <span
                    className={`mt-0.5 shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusStyle(sub.status)}`}
                  >
                    {statusLabel(sub.status)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-[#CBD5E1]/50">
                  <span>{packageTierLabel(sub.package_tier)}</span>
                  <span>·</span>
                  <span>{formatVibeLabel(sub.vibe)}</span>
                  <span>·</span>
                  <span>{formatDate(sub.created_at)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail + review panel */}
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
                <p className="mt-1 text-sm text-[#CBD5E1]">
                  {selected.artist_name}
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] divide-y divide-white/6">
                {[
                  {
                    label: "Package",
                    value: packageTierLabel(selected.package_tier),
                  },
                  { label: "Email", value: selected.email },
                  {
                    label: "Vibe",
                    value: formatVibeLabel(selected.vibe),
                  },
                  { label: "Submitted", value: formatDate(selected.created_at) },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <span className="text-[#CBD5E1]/55">{row.label}</span>
                    <span className="font-medium text-[#F8FAFC]">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#CBD5E1]/55">
                  Artist message
                </p>
                <p className="mt-2 rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-[#CBD5E1]">
                  {selected.message || (
                    <span className="text-[#CBD5E1]/35">
                      No message provided.
                    </span>
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
                    onChange={(e) => setStatus(e.target.value)}
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
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Rotation fit, follow-up actions, scheduling notes..."
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
