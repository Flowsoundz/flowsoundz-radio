"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

const TIERS = [
  {
    id: "STARTER",
    name: "Starter",
    price: "$49/mo",
    maxArtists: 5,
    perks: ["Up to 5 artist profiles", "Unified analytics dashboard", "Shared drop scheduling", "Priority submission lane"],
    color: "border-cyan-400/30 bg-cyan-400/[0.07]",
    accent: "text-cyan-300",
    badge: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
  },
  {
    id: "PRO",
    name: "Pro",
    price: "$99/mo",
    maxArtists: 20,
    perks: ["Up to 20 artist profiles", "Everything in Starter", "Label page on FlowSoundz", "Revenue share tracking for all artists", "White-glove curation review"],
    color: "border-fuchsia-400/30 bg-fuchsia-400/[0.07]",
    accent: "text-fuchsia-300",
    badge: "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-200",
  },
] as const;

export default function LabelRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to create label.");
      router.push("/label/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setCreating(false);
    }
  }

  return (
    <AppShell eyebrow="Label & Agency" title="Create Your Label Account">
      <div className="mb-8">
        <Link href="/" className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 transition hover:border-white/20 hover:text-white">
          ← Home
        </Link>
      </div>

      {/* Hero */}
      <div className="mb-8 rounded-[2rem] border border-white/8 bg-[linear-gradient(135deg,#0c1328_0%,#07111f_55%,#050816_100%)] px-6 py-10 text-center">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-fuchsia-300/80">For Labels & Managers</p>
        <h2 className="text-2xl font-bold text-white">One dashboard. All your artists.</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
          Manage submissions, analytics, drop scheduling, and revenue share for every artist on your roster — from a single login.
        </p>
      </div>

      {/* Tier cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        {TIERS.map((tier) => (
          <div key={tier.id} className={`rounded-[1.8rem] border p-5 ${tier.color}`}>
            <div className="mb-4 flex items-baseline justify-between gap-2">
              <p className={`text-sm font-bold ${tier.accent}`}>{tier.name}</p>
              <p className="text-xs text-slate-400">{tier.price}</p>
            </div>
            <p className="mb-3 text-xs text-slate-400">Up to <span className="font-semibold text-white">{tier.maxArtists} artists</span></p>
            <ul className="space-y-1.5">
              {tier.perks.map((p) => (
                <li key={p} className="flex items-start gap-2 text-[11px] text-slate-300">
                  <span className={`mt-[3px] text-[9px] ${tier.accent}`}>✓</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Registration form */}
      <div className="rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 p-6">
        <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Create your label profile</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Label / Agency Name</span>
            <input
              type="text"
              placeholder="e.g. Midnight Records"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-fuchsia-400/40 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Business Email</span>
            <input
              type="email"
              placeholder="you@yourlabel.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-fuchsia-400/40 focus:outline-none"
            />
          </label>
        </div>
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating || !name.trim()}
            className="rounded-full bg-[linear-gradient(135deg,#a855f7_0%,#ec4899_100%)] px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_18px_rgba(168,85,247,0.3)] transition disabled:opacity-50 hover:shadow-[0_0_28px_rgba(168,85,247,0.5)]"
          >
            {creating ? "Creating…" : "Create Label Profile"}
          </button>
          <p className="text-xs text-slate-600">Free to start · Billing begins when you add your first artist</p>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-slate-600">
        Already have a label account?{" "}
        <Link href="/label/dashboard" className="text-fuchsia-400 underline hover:text-fuchsia-300">Go to dashboard →</Link>
      </p>
    </AppShell>
  );
}
