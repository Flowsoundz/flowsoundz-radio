"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";

type Job = {
  id: string;
  title: string;
  artist: string;
  status: "PENDING" | "PROCESSING" | "FAILED" | "READY";
  error: string | null;
  sourceAudioUrl: string | null;
  durationSec: number | null;
  updatedAt: string;
};

type Data = {
  counts: { pending: number; processing: number; ready: number; failed: number };
  jobs: Job[];
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  PROCESSING: "border-cyan-300/30 bg-cyan-300/10 text-cyan-200",
  FAILED: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  READY: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
};

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-3">
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">{label}</p>
    </div>
  );
}

export default function MasteringAdminPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/mastering");
      if (!res.ok) {
        setError(res.status === 403 ? "Admin sign-in required." : `Failed (${res.status})`);
        return;
      }
      setData((await res.json()) as Data);
      setError(null);
    } catch {
      setError("Network error");
    }
  }, []);

  // Poll every 5s so the queue updates live as the worker processes jobs.
  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 5000);
    return () => clearInterval(id);
  }, [load]);

  async function retry(job: Job) {
    setRetrying(job.id);
    try {
      await fetch("/api/admin/mastering", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId: job.id, sourceAudioUrl: overrides[job.id]?.trim() || undefined }),
      });
      await load();
    } finally {
      setRetrying(null);
    }
  }

  return (
    <AppShell
      eyebrow="Admin"
      title="Mastering Queue"
      subtitle="Live status of the loudness-mastering pipeline. Jobs flow PENDING → PROCESSING → READY as the worker processes them; retry any that fail."
    >
      {error ? (
        <div className="glass-card rounded-[1.8rem] p-6 text-sm text-rose-100">{error}</div>
      ) : !data ? (
        <div className="glass-card rounded-[1.8rem] p-6 text-sm text-white/60">Loading…</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Pending" value={data.counts.pending} accent="text-amber-300" />
            <Stat label="Processing" value={data.counts.processing} accent="text-cyan-300" />
            <Stat label="Ready" value={data.counts.ready} accent="text-emerald-300" />
            <Stat label="Failed" value={data.counts.failed} accent="text-rose-300" />
          </div>

          {data.counts.processing === 0 && data.counts.pending > 0 ? (
            <div className="rounded-[1.4rem] border border-amber-300/20 bg-amber-300/[0.05] px-4 py-3 text-xs leading-5 text-amber-100/80">
              Jobs are queued but nothing is processing — check the mastering worker is running on Railway.
            </div>
          ) : null}

          <div className="glass-card rounded-[1.8rem] p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-white/40">
              Active &amp; Failed Jobs
            </p>
            {data.jobs.length === 0 ? (
              <p className="text-sm text-white/50">Queue is clear — nothing pending or failed.</p>
            ) : (
              <ul className="space-y-2">
                {data.jobs.map((job) => (
                  <li key={job.id} className="rounded-[1.2rem] border border-white/8 bg-white/[0.02] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {job.title} <span className="text-white/40">· {job.artist}</span>
                        </p>
                        <p className="text-[11px] text-white/35">
                          {new Date(job.updatedAt).toLocaleTimeString()}
                          {job.durationSec ? ` · ${job.durationSec}s` : ""}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[job.status]}`}>
                        {job.status}
                      </span>
                    </div>
                    {job.status === "FAILED" ? (
                      <div className="mt-2 space-y-2">
                        {job.error ? (
                          <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-[11px] leading-5 text-rose-200/90">{job.error}</p>
                        ) : null}
                        <div className="flex items-center gap-2">
                          <input
                            value={overrides[job.id] ?? ""}
                            onChange={(e) => setOverrides((o) => ({ ...o, [job.id]: e.target.value }))}
                            placeholder="New source URL (optional)"
                            className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white placeholder:text-white/25 outline-none focus:border-cyan-300/40"
                            inputMode="url"
                          />
                          <button
                            onClick={() => void retry(job)}
                            disabled={retrying === job.id}
                            className="shrink-0 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-1.5 text-xs font-bold text-black disabled:opacity-40"
                          >
                            {retrying === job.id ? "…" : "Retry"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
