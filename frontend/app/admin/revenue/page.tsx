"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

type Payout = {
  id: string;
  artistId: string;
  month: string;
  playCount: number;
  totalPlays: number;
  playShare: number;
  estimatedAmount: number;
  paid: boolean;
  paidAt: string | null;
  artist: { name: string; slug: string };
};

type Pool = {
  id: string;
  month: string;
  totalRevenue: number;
  artistPool: number;
  distributed: boolean;
  notes: string | null;
  payouts: Payout[];
};

export default function RevenueAdminPage() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [totalRevenue, setTotalRevenue] = useState("");
  const [poolPct, setPoolPct] = useState("30");
  const [notes, setNotes] = useState("");
  const [computing, setComputing] = useState(false);
  const [result, setResult] = useState<{ payoutsCreated?: number; totalPlays?: number } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/revenue");
      const data = (await res.json()) as { pools?: Pool[] };
      setPools(data.pools ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function compute() {
    setComputing(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/revenue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, totalRevenue: Number(totalRevenue), artistPoolPct: Number(poolPct), notes }),
      });
      const data = (await res.json()) as { error?: string; payoutsCreated?: number; totalPlays?: number };
      if (!res.ok) throw new Error(data.error ?? "Failed.");
      setResult(data);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error.");
    } finally {
      setComputing(false);
    }
  }

  async function markPaid(payoutId: string, paid: boolean) {
    await fetch("/api/admin/revenue", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payoutId, paid }),
    });
    void load();
  }

  return (
    <AppShell eyebrow="Admin" title="Revenue Share">
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Link href="/admin" className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 transition hover:border-white/20 hover:text-white">
          ← Admin
        </Link>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
          Revenue Pools
        </span>
      </div>

      {/* Compute new pool */}
      <section className="mb-6 rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 p-6">
        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Create / Update Monthly Pool</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Month</span>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white [color-scheme:dark] focus:border-cyan-400/40 focus:outline-none" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Gross Revenue ($)</span>
            <input type="number" min="0" step="0.01" placeholder="e.g. 847.50" value={totalRevenue} onChange={(e) => setTotalRevenue(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-cyan-400/40 focus:outline-none" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Artist Pool %</span>
            <input type="number" min="0" max="100" value={poolPct} onChange={(e) => setPoolPct(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-cyan-400/40 focus:outline-none" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Notes</span>
            <input type="text" placeholder="Optional" value={notes} onChange={(e) => setNotes(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-white/20 focus:outline-none" />
          </label>
        </div>
        {totalRevenue && (
          <p className="mt-3 text-xs text-slate-500">
            Artist pool: <span className="text-emerald-400 font-semibold">${(Number(totalRevenue) * Number(poolPct) / 100).toFixed(2)}</span> of ${Number(totalRevenue).toFixed(2)}
          </p>
        )}
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        {result && (
          <p className="mt-3 text-xs text-emerald-400">
            Computed {result.payoutsCreated} artist payouts across {result.totalPlays?.toLocaleString()} total plays.
          </p>
        )}
        <button type="button" onClick={() => void compute()} disabled={computing || !totalRevenue || !month}
          className="mt-4 rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-5 py-2 text-sm font-bold text-white shadow-[0_0_14px_rgba(0,229,255,0.25)] transition disabled:opacity-50 hover:shadow-[0_0_22px_rgba(0,229,255,0.4)]">
          {computing ? "Computing…" : "Compute Payouts"}
        </button>
      </section>

      {/* Pool history */}
      {loading ? (
        <p className="text-xs text-slate-500">Loading…</p>
      ) : pools.length === 0 ? (
        <p className="text-xs text-slate-500">No revenue pools yet.</p>
      ) : (
        <div className="space-y-4">
          {pools.map((pool) => {
            const paidAmount = pool.payouts.filter((p) => p.paid).reduce((s, p) => s + p.estimatedAmount, 0);
            return (
              <div key={pool.id} className="overflow-hidden rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80">
                <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.05] px-6 py-4">
                  <span className="text-sm font-bold text-white">{pool.month}</span>
                  <span className="text-xs text-slate-400">Gross: <span className="text-white">${pool.totalRevenue.toFixed(2)}</span></span>
                  <span className="text-xs text-slate-400">Pool: <span className="text-emerald-300">${pool.artistPool.toFixed(2)}</span></span>
                  <span className="text-xs text-slate-400">Paid out: <span className="text-emerald-400">${paidAmount.toFixed(2)}</span></span>
                  <span className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-semibold ${pool.distributed ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : "border-amber-400/25 bg-amber-400/10 text-amber-300"}`}>
                    {pool.distributed ? "Distributed" : "Pending"}
                  </span>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {pool.payouts.map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center gap-3 px-6 py-3">
                      <Link href={`/artists/${p.artist.slug}`} className="min-w-0 flex-1 text-sm font-semibold text-white hover:text-cyan-300 truncate">
                        {p.artist.name}
                      </Link>
                      <span className="text-xs tabular-nums text-slate-400">{p.playCount.toLocaleString()} plays</span>
                      <span className="text-xs tabular-nums text-slate-400">{(p.playShare * 100).toFixed(1)}%</span>
                      <span className="text-xs font-bold tabular-nums text-emerald-300">${p.estimatedAmount.toFixed(2)}</span>
                      <button type="button" onClick={() => void markPaid(p.id, !p.paid)}
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition ${p.paid ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300 hover:bg-red-400/10 hover:text-red-300 hover:border-red-400/25" : "border-white/10 text-slate-400 hover:border-emerald-400/25 hover:text-emerald-300"}`}>
                        {p.paid ? `Paid ${p.paidAt ? new Date(p.paidAt).toLocaleDateString() : ""}` : "Mark Paid"}
                      </button>
                    </div>
                  ))}
                  {pool.payouts.length === 0 && (
                    <p className="px-6 py-4 text-xs text-slate-600">No payouts computed yet.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
