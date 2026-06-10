"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import Link from "next/link";

type PreviewData = {
  newSongsCount: number;
  waitlistCount: number;
  userCount: number;
  totalRecipients: number;
};

type SendResult = {
  ok: boolean;
  dryRun: boolean;
  recipients: number;
  sent: number;
  skipped: number;
  topSongs: Array<{ title: string; artist: string; plays: number; vibe: string }>;
  newSongsCount: number;
  weekLabel: string;
};

export default function DigestPage() {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/admin/digest")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: PreviewData | null) => { if (d) setPreview(d); })
      .catch(() => {});
  }, []);

  async function send(dryRun: boolean) {
    setSending(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun }),
      });
      const data = (await res.json()) as SendResult;
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <AppShell eyebrow="Admin" title="Weekly Digest">
      <div className="mb-6">
        <Link
          href="/admin"
          className="text-xs text-slate-400 hover:text-white transition"
        >
          ← Admin
        </Link>
      </div>

      {preview && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Waitlist", value: preview.waitlistCount },
            { label: "Users", value: preview.userCount },
            { label: "Total recipients", value: preview.totalRecipients },
            { label: "New songs", value: preview.newSongsCount },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-[1.4rem] border border-white/8 bg-[#0B1020]/80 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
              <p className="mt-1 text-2xl font-bold text-white">{value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-6">
        <button
          type="button"
          onClick={() => void send(true)}
          disabled={sending}
          className="rounded-full border border-white/15 bg-white/8 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/12 disabled:opacity-50"
        >
          {sending ? "Running..." : "Dry Run (no emails sent)"}
        </button>
        <button
          type="button"
          onClick={() => void send(false)}
          disabled={sending}
          className="rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_18px_rgba(0,229,255,0.2)] transition hover:shadow-[0_0_28px_rgba(0,229,255,0.35)] disabled:opacity-50"
        >
          {sending ? "Sending..." : "Send Digest"}
        </button>
      </div>

      {error && (
        <div className="rounded-[1.2rem] border border-red-400/20 bg-red-400/[0.07] px-5 py-4 text-sm text-red-300 mb-4">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.05]">
            <h2 className="text-sm font-semibold text-white">
              {result.dryRun ? "Dry Run Complete" : "Digest Sent"} — {result.weekLabel}
            </h2>
            {!result.dryRun && (
              <p className="mt-1 text-xs text-slate-400">
                {result.sent} sent · {result.skipped} skipped
              </p>
            )}
          </div>
          <div className="px-6 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-3">
              Top tracks included
            </p>
            {result.topSongs.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-white/[0.04] last:border-0">
                <div>
                  <p className="text-sm font-medium text-white">{s.title}</p>
                  <p className="text-xs text-slate-400">{s.artist} · {s.vibe}</p>
                </div>
                <span className="text-xs tabular-nums text-slate-400">{s.plays} plays</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
