"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

async function openBillingPortal() {
  const res = await fetch("/api/membership/portal", { method: "POST" });
  const data = await res.json() as { url?: string };
  if (data.url) window.location.href = data.url;
}

export function AuthButton() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  if (status === "loading") {
    return (
      <div className="h-8 w-24 animate-pulse rounded-full bg-white/5" />
    );
  }

  if (!session?.user) {
    return (
      <Link
        href="/signin"
        className="inline-flex h-8 items-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-xs font-semibold text-slate-300 transition hover:border-white/20 hover:text-white"
      >
        Sign in
      </Link>
    );
  }

  const user = session.user as {
    name?: string | null;
    email?: string | null;
    isAdmin?: boolean;
    tier?: string;
  };

  const label = user.name ?? user.email?.split("@")[0] ?? "Account";
  const tier = user.tier ?? "FREE";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-slate-300 transition hover:border-white/20 hover:text-white"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="max-w-[100px] truncate">{label}</span>
        {tier !== "FREE" && (
          <span className="rounded-full bg-cyan-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-cyan-300">
            {tier}
          </span>
        )}
        <svg viewBox="0 0 24 24" className="h-3 w-3 opacity-50" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-40 w-52 rounded-[1.4rem] border border-white/10 bg-[#0B1020]/97 p-2 shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
            <div className="px-3 py-2 text-[11px] text-slate-500">
              {user.email}
            </div>
            <div className="my-1 border-t border-white/8" />
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-[1rem] px-3 py-2 text-xs text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              My Profile
            </Link>
            <Link
              href="/artist/metrics"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-[1rem] px-3 py-2 text-xs text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Station Metrics
            </Link>
            <Link
              href="/artist/dashboard"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-[1rem] px-3 py-2 text-xs text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              Creator Hub
            </Link>
            {user.isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 rounded-[1rem] px-3 py-2 text-xs text-fuchsia-300 transition hover:bg-white/5"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg>
                Admin Panel
              </Link>
            )}
            {tier !== "FREE" && (
              <>
                <button
                  type="button"
                  onClick={() => { setOpen(false); void openBillingPortal(); }}
                  className="flex w-full items-center gap-2 rounded-[1rem] px-3 py-2 text-xs text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                  Manage billing
                </button>
              </>
            )}
            <div className="my-1 border-t border-white/8" />
            <button
              type="button"
              onClick={() => { setOpen(false); void signOut({ callbackUrl: "/" }); }}
              className="flex w-full items-center gap-2 rounded-[1rem] px-3 py-2 text-xs text-slate-500 transition hover:bg-white/5 hover:text-red-400"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
