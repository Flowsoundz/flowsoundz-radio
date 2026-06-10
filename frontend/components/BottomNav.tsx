"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";

const STATIC_TABS = [
  {
    href: "/radio",
    label: "Radio",
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="2" />
        <path d="M4.93 19.07A10 10 0 1 1 19.07 4.93" />
        <path d="M7.76 16.24A6 6 0 1 1 16.24 7.76" />
      </svg>
    ),
  },
  {
    href: "/songs",
    label: "Discover",
    matchPrefixes: ["/songs", "/artists"],
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
] as const;

const CREATOR_ICON = (
  <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const MORE_LINKS = [
  { href: "/profile", label: "My Profile" },
  { href: "/search", label: "Search" },
  { href: "/drops", label: "Drops" },
  { href: "/for-artists", label: "For Artists" },
  { href: "/membership", label: "Membership" },
  { href: "/visualizer", label: "Visualizer" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/support", label: "Support" },
  { href: "/schedule", label: "Schedule" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: session } = useSession();

  const isArtist = (session?.user as { role?: string } | undefined)?.role === "ARTIST";
  const creatorHref = isArtist ? "/artist/dashboard" : "/for-artists";
  const creatorMatchPrefixes = ["/artist", "/for-artists"];

  function isActive(href: string, matchPrefixes?: readonly string[]) {
    if (href === "/") return pathname === "/";
    if (matchPrefixes) return matchPrefixes.some((p) => pathname.startsWith(p));
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const moreIsActive = MORE_LINKS.some((l) => pathname.startsWith(l.href));
  const creatorActive = creatorMatchPrefixes.some((p) => pathname.startsWith(p));

  return (
    <>
      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* More drawer */}
      <div
        className={`fixed inset-x-0 bottom-[72px] z-50 transition-transform duration-300 ease-out ${
          drawerOpen ? "translate-y-0" : "translate-y-[110%]"
        }`}
      >
        <div className="mx-auto max-w-md rounded-t-[2rem] border border-white/10 bg-[#07111f]/96 px-4 pb-6 pt-4 backdrop-blur-2xl shadow-[0_-20px_60px_rgba(0,0,0,0.5)]">
          <div className="mb-4 flex justify-center">
            <div className="h-1 w-10 rounded-full bg-white/20" />
          </div>
          <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-white/35">
            More
          </p>
          <div className="grid grid-cols-2 gap-2">
            {MORE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setDrawerOpen(false)}
                className={`flex min-h-12 items-center justify-center rounded-2xl border px-4 text-sm font-semibold transition ${
                  pathname.startsWith(link.href)
                    ? "border-[#00FF88]/25 bg-[#00FF88]/10 text-white"
                    : "border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/14 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {session?.user ? (
              <button
                type="button"
                onClick={() => { setDrawerOpen(false); void signOut({ callbackUrl: "/" }); }}
                className="flex min-h-12 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] px-4 text-sm font-semibold text-slate-300 transition hover:border-white/14 hover:text-red-400"
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/signin"
                onClick={() => setDrawerOpen(false)}
                className="flex min-h-12 items-center justify-center rounded-2xl border border-[#FF2DA6]/25 bg-[#FF2DA6]/[0.07] px-4 text-sm font-semibold text-[#FF2DA6] transition hover:bg-[#FF2DA6]/[0.13]"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/8 bg-[#050816]/90 backdrop-blur-2xl">
        <div className="mx-auto grid max-w-lg grid-cols-4 px-2 pb-safe pt-1">
          {STATIC_TABS.map((tab) => {
            const active = isActive(tab.href, "matchPrefixes" in tab ? tab.matchPrefixes : undefined);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold transition ${
                  active ? "text-[#00e5ff]" : "text-slate-400 hover:text-slate-200"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span className={active ? "drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]" : ""}>
                  {tab.icon}
                </span>
                <span className="uppercase tracking-[0.14em]">{tab.label}</span>
              </Link>
            );
          })}

          {/* Creator tab — routes to dashboard for artists, for-artists page for others */}
          <Link
            href={creatorHref}
            className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold transition ${
              creatorActive ? "text-[#00FF88]" : "text-slate-400 hover:text-slate-200"
            }`}
            aria-current={creatorActive ? "page" : undefined}
          >
            <span className={creatorActive ? "drop-shadow-[0_0_8px_rgba(0,255,136,0.6)]" : ""}>
              {CREATOR_ICON}
            </span>
            <span className="uppercase tracking-[0.14em]">Creator</span>
          </Link>

          {/* More tab */}
          <button
            type="button"
            aria-label="More navigation options"
            onClick={() => setDrawerOpen((o) => !o)}
            className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold transition ${
              drawerOpen || moreIsActive ? "text-[#00e5ff]" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <svg
              aria-hidden="true"
              className={`h-5 w-5 transition-transform duration-200 ${drawerOpen ? "rotate-45" : ""}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="uppercase tracking-[0.14em]">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
