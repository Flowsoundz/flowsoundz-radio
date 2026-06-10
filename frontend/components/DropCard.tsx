"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MembershipUpgradeSheet } from "@/components/MembershipUpgradeSheet";

type DropCardProps = {
  id: string;
  title: string;
  artistName: string;
  artistSlug: string;
  coverUrl: string | null;
  isVault: boolean;
  memberReleaseAt: string | null;
  publicReleaseAt: string | null;
  userTier: "FREE" | "INSIDER" | "VAULT";
  isDropped: boolean;
};

function useCountdown(target: string | null) {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    if (!target) return;
    function tick() {
      const diff = new Date(target!).getTime() - Date.now();
      if (diff <= 0) { setDisplay("Live Now"); return; }
      const d = Math.floor(diff / 86_400_000);
      const h = Math.floor((diff % 86_400_000) / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      if (d > 0) setDisplay(`${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`);
      else setDisplay(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return display;
}

export function DropCard({
  id,
  title,
  artistName,
  artistSlug,
  coverUrl,
  isVault,
  memberReleaseAt,
  publicReleaseAt,
  userTier,
  isDropped,
}: DropCardProps) {
  const [showUpgrade, setShowUpgrade] = useState(false);

  const targetDate = isDropped
    ? null
    : userTier === "VAULT"
    ? (memberReleaseAt ?? publicReleaseAt)
    : publicReleaseAt;

  const countdown = useCountdown(targetDate);

  const isVaultOnly = isVault && !memberReleaseAt && !publicReleaseAt;
  const hasEarlyAccess = memberReleaseAt && (userTier === "VAULT");
  const isLocked = isVault && userTier === "FREE" && !isDropped;
  const countdownTarget = hasEarlyAccess ? memberReleaseAt : publicReleaseAt;
  const countdownDisplay = useCountdown(isDropped ? null : countdownTarget ?? null);

  void countdown;

  return (
    <>
      <div className="group relative overflow-hidden rounded-[1.8rem] border border-white/8 bg-[#0B1020]/90 p-4 transition hover:border-white/14">
        <div className="flex gap-4">
          {/* Cover */}
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white/5 sm:h-20 sm:w-20">
            {coverUrl ? (
              <Image src={coverUrl} alt={title} fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl">🎵</div>
            )}
            {isLocked && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 backdrop-blur-sm">
                <span className="text-lg">🔒</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              {isVault && (
                <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-fuchsia-300">
                  Vault
                </span>
              )}
              {isDropped && (
                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-300">
                  New Drop
                </span>
              )}
              {!isDropped && hasEarlyAccess && (
                <span className="rounded-full border border-fuchsia-400/25 bg-fuchsia-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-fuchsia-300">
                  Early Access
                </span>
              )}
            </div>
            <p className="truncate text-sm font-bold text-white">{title}</p>
            <Link href={`/artists/${artistSlug}`} className="text-xs text-slate-400 hover:text-slate-200 transition">
              {artistName}
            </Link>

            {/* Countdown or CTA */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {isDropped ? (
                <Link
                  href={`/songs`}
                  className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-400/18"
                >
                  Listen Now →
                </Link>
              ) : isLocked ? (
                <button
                  type="button"
                  onClick={() => setShowUpgrade(true)}
                  className="rounded-full bg-[linear-gradient(135deg,#a855f7_0%,#ec4899_100%)] px-3 py-1.5 text-xs font-bold text-white shadow-[0_0_14px_rgba(168,85,247,0.3)] transition hover:shadow-[0_0_22px_rgba(168,85,247,0.5)]"
                >
                  🔒 Unlock with Vault
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold tabular-nums text-white">
                    {countdownDisplay || "…"}
                  </span>
                  {memberReleaseAt && publicReleaseAt && userTier !== "VAULT" && (
                    <span className="text-[10px] text-slate-500">until public release</span>
                  )}
                  {memberReleaseAt && userTier === "VAULT" && (
                    <span className="text-[10px] text-fuchsia-400">vault early access</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showUpgrade && (
        <MembershipUpgradeSheet
          songTitle={title}
          songArtist={artistName}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </>
  );
}
