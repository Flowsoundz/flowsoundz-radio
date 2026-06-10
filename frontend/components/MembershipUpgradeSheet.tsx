"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Props = {
  songTitle: string;
  songArtist: string;
  onClose: () => void;
};

const TIERS = [
  {
    id: "insider" as const,
    name: "Insider",
    price: "$7.99/mo",
    color: "border-cyan-400/35 bg-cyan-400/[0.08]",
    accent: "text-cyan-300",
    btnCls: "bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] text-white shadow-[0_0_18px_rgba(0,229,255,0.3)] hover:shadow-[0_0_28px_rgba(0,229,255,0.5)]",
    perks: ["Day One Access to new drops", "Behind the Mix notes", "Early Midnight Drop access"],
  },
  {
    id: "vault" as const,
    name: "Vault",
    price: "$14.99/mo",
    color: "border-fuchsia-400/35 bg-fuchsia-400/[0.08]",
    accent: "text-fuchsia-300",
    btnCls: "border border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-50 hover:bg-fuchsia-400/18",
    perks: ["Full Vault exclusive library", "Priority access to every window", "Earliest entry to all drops"],
  },
];

export function MembershipUpgradeSheet({ songTitle, songArtist, onClose }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleCheckout(tier: "insider" | "vault") {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/signin?next=/membership");
      return;
    }
    setLoading(tier);
    setError("");
    try {
      const res = await fetch("/api/membership/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Checkout unavailable.");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        ref={sheetRef}
        className="relative z-10 w-full max-w-lg rounded-t-[2rem] sm:rounded-[2rem] border border-white/10 bg-[#07111f]/97 p-6 pb-10 shadow-[0_-24px_80px_rgba(0,0,0,0.6)] sm:pb-6"
      >
        {/* Handle */}
        <div className="mb-5 flex justify-center sm:hidden">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300/80">
              Members only
            </p>
            <h2 className="mt-1.5 text-lg font-bold text-white">
              Unlock &ldquo;{songTitle}&rdquo;
            </h2>
            <p className="text-sm text-slate-400">{songArtist} · Vault exclusive</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-white/10 p-1.5 text-slate-400 transition hover:border-white/20 hover:text-white"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-[1rem] border border-red-400/20 bg-red-400/[0.07] px-4 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Tier cards */}
        <div className="grid gap-3 sm:grid-cols-2">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`flex flex-col rounded-[1.4rem] border p-4 ${tier.color}`}
            >
              <div className="flex items-baseline justify-between gap-2 mb-3">
                <p className={`text-sm font-bold ${tier.accent}`}>{tier.name}</p>
                <p className="text-xs text-slate-400">{tier.price}</p>
              </div>
              <ul className="mb-4 flex-1 space-y-1.5">
                {tier.perks.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-[11px] text-slate-300">
                    <span className={`mt-[3px] text-[9px] ${tier.accent}`}>✓</span>
                    {p}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => void handleCheckout(tier.id)}
                disabled={loading !== null}
                className={`w-full rounded-full py-2.5 text-xs font-bold transition disabled:opacity-50 ${tier.btnCls}`}
              >
                {loading === tier.id ? "Redirecting…" : `Join ${tier.name}`}
              </button>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-[10px] text-slate-600">
          Cancel any time · No hidden fees ·{" "}
          <a href="/membership" onClick={onClose} className="underline hover:text-slate-400">
            Compare all tiers
          </a>
        </p>
      </div>
    </div>
  );
}
