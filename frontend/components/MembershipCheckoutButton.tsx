"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Tier = "insider" | "vault";

interface Props {
  tier: Tier;
  className?: string;
  label?: string;
}

export function MembershipCheckoutButton({ tier, className, label }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const user = session?.user as { tier?: string } | undefined;
  const currentTier = user?.tier?.toLowerCase() ?? "free";
  const isActive = currentTier === tier;

  async function handleClick() {
    if (status === "loading") return;
    if (!session?.user) {
      router.push(`/signin?next=/membership`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/membership/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Checkout failed.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  if (isActive) {
    return (
      <span className={`inline-flex min-h-11 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-5 text-sm font-semibold text-emerald-300 ${className ?? ""}`}>
        ✓ Current plan
      </span>
    );
  }

  const buttonLabel = status === "loading"
    ? "Loading…"
    : loading
    ? "Redirecting…"
    : label ?? (session?.user ? `Join ${tier === "insider" ? "Insider" : "Vault"}` : "Sign in to subscribe");

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p className="text-center text-xs text-red-400">{error}</p>
      )}
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={loading || status === "loading"}
        className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm transition disabled:opacity-50 ${className ?? ""}`}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

export function ManageMembershipButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/membership/portal", { method: "POST" });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Portal unavailable. Try again.");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      {error && <p className="text-center text-xs text-red-400">{error}</p>}
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-slate-400 transition hover:border-white/20 hover:text-white disabled:opacity-50"
      >
        {loading ? "Loading…" : "Manage billing"}
      </button>
    </div>
  );
}
