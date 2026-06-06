"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import type { PromoPaymentRecord, PromoPaymentStatus } from "@/lib/promoPaymentStore";

const TIER_STYLES: Record<string, { label: string; cls: string }> = {
  basic: { label: "Basic — $15", cls: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200" },
  featured: { label: "Featured — $45", cls: "border-violet-400/20 bg-violet-400/10 text-violet-200" },
  sponsored: { label: "Sponsored — $95", cls: "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200" },
};

const STATUS_STYLES: Record<PromoPaymentStatus, { label: string; cls: string }> = {
  pending_review: { label: "Pending Review", cls: "border-amber-400/20 bg-amber-400/10 text-amber-200" },
  reviewed: { label: "Reviewed", cls: "border-slate-400/20 bg-slate-400/10 text-slate-300" },
  approved: { label: "Approved", cls: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" },
  rejected: { label: "Not Approved", cls: "border-red-400/20 bg-red-400/10 text-red-300" },
};

function PaymentCard({
  payment,
  password,
  onUpdated,
}: {
  payment: PromoPaymentRecord;
  password: string;
  onUpdated: (p: PromoPaymentRecord) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<PromoPaymentStatus>(payment.status);
  const [notes, setNotes] = useState(payment.internalNotes ?? "");
  const [error, setError] = useState("");

  const tier = TIER_STYLES[payment.tier] ?? TIER_STYLES.basic;
  const st = STATUS_STYLES[status];

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, id: payment.id, status, internalNotes: notes }),
      });
      const data = (await res.json()) as { ok?: boolean; payment?: PromoPaymentRecord; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Save failed.");
      if (data.payment) onUpdated(data.payment);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass-card rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-white">{payment.artistName}</p>
          {payment.songTitle && (
            <p className="mt-0.5 text-sm text-slate-400">{payment.songTitle}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            {payment.email} ·{" "}
            {new Date(payment.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${tier.cls}`}>
            {tier.label}
          </span>
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${st.cls}`}>
            {st.label}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 gap-2">
          {(["pending_review", "reviewed", "approved", "rejected"] as PromoPaymentStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition ${
                status === s
                  ? STATUS_STYLES[s].cls
                  : "border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300"
              }`}
            >
              {STATUS_STYLES[s].label}
            </button>
          ))}
        </div>
      </div>

      <textarea
        className="mt-3 w-full rounded-[1rem] border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-white/20"
        rows={2}
        placeholder="Internal notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <button
        type="button"
        disabled={saving}
        onClick={save}
        className="mt-3 rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-5 py-2 text-xs font-bold text-white shadow-[0_0_14px_rgba(0,229,255,0.25)] transition disabled:opacity-50 hover:shadow-[0_0_22px_rgba(0,229,255,0.4)]"
      >
        {saving ? "Saving…" : "Save"}
      </button>

      <p className="mt-2 text-[10px] text-slate-600">
        Stripe session: {payment.stripeSessionId}
      </p>
    </div>
  );
}

export default function AdminPromoPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<PromoPaymentRecord[]>([]);
  const [error, setError] = useState("");

  async function load(pw: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/promo?password=${encodeURIComponent(pw)}`);
      const data = (await res.json()) as { payments?: PromoPaymentRecord[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Unauthorized.");
      setPayments(data.payments ?? []);
      setAuthed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const stored = sessionStorage.getItem("fsz-admin-pw");
    if (stored) void load(stored);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    sessionStorage.setItem("fsz-admin-pw", password);
    void load(password);
  }

  const pending = payments.filter((p) => p.status === "pending_review").length;

  return (
    <AppShell
      eyebrow="Admin"
      title="Promo Review"
      subtitle={
        !authed
          ? "Enter your admin password to access paid promo submissions."
          : payments.length === 0
            ? "No paid promo submissions yet."
            : pending > 0
              ? `${payments.length} submission${payments.length === 1 ? "" : "s"} · ${pending} pending review`
              : `${payments.length} submission${payments.length === 1 ? "" : "s"} · all reviewed`
      }
    >
      {!authed ? (
        <form onSubmit={handleAuth} className="mx-auto max-w-sm">
          <div className="glass-card rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 p-6">
            <p className="text-sm text-slate-300">Admin password</p>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-3 w-full rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none focus:border-white/20"
              placeholder="••••••••"
            />
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className="mt-4 w-full rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {loading ? "Loading…" : "Unlock"}
            </button>
          </div>
        </form>
      ) : payments.length === 0 ? (
        <div className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] px-6 py-8 text-center">
          <p className="text-sm text-slate-400">
            No paid submissions yet. Once an artist completes checkout, their
            submission will appear here.
          </p>
          <p className="mt-2 text-xs text-slate-600">
            In production, payments are also sent to your email via Stripe.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {payments.map((p) => (
            <PaymentCard
              key={p.id}
              payment={p}
              password={sessionStorage.getItem("fsz-admin-pw") ?? ""}
              onUpdated={(updated) =>
                setPayments((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
              }
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
