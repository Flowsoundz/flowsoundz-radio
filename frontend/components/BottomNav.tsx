"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";

type DrawerLink = {
  href: string;
  label: string;
  description?: string;
};

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

const LISTENER_LINKS: readonly DrawerLink[] = [
  { href: "/schedule", label: "Schedule", description: "See which block or show is coming up next." },
  { href: "/drops", label: "Drops", description: "Open featured music moments and fresh releases." },
  { href: "/membership", label: "Membership", description: "Upgrade for insider access and replay perks." },
  { href: "/visualizer", label: "Visualizer", description: "Run the station with a visual companion." },
];

const HELP_LINKS: readonly DrawerLink[] = [
  { href: "/profile", label: "My Profile" },
  { href: "/search", label: "Search" },
  { href: "/label/register", label: "Label / Agency" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/support", label: "Support" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: session } = useSession();

  const isArtist = (session?.user as { role?: string } | undefined)?.role === "ARTIST";
  const creatorHref = isArtist ? "/artist/dashboard" : "/for-artists";
  const creatorMatchPrefixes = ["/artist", "/for-artists"];
  const creatorLinks: DrawerLink[] = isArtist
    ? [
        { href: "/artist/dashboard", label: "Creator Hub", description: "Review station outcomes and next actions." },
        { href: "/artist/submit", label: "Submit Music", description: "Send a release into the station pipeline." },
        { href: "/artist/kit", label: "AI Release Kit", description: "Generate promo copy, hooks, and ideas fast." },
        { href: "/artist/submissions", label: "My Submissions", description: "Track reviews, approvals, and airplay." },
      ]
    : [
        { href: "/for-artists", label: "For Artists", description: "Understand how the creator side works." },
        { href: "/artist/create", label: "Start A Release", description: "Open the guided creator flow." },
        { href: "/artist/kit", label: "AI Release Kit", description: "Try the AI release helper before submitting." },
        { href: "/label/register", label: "Label / Agency", description: "Register a roster, collective, or team." },
      ];
  const quickActions: DrawerLink[] = [
    { href: "/radio", label: "Listen Live", description: "Jump straight into the station." },
    { href: "/songs", label: "Browse Music", description: "Explore current tracks and artists." },
    {
      href: creatorHref,
      label: isArtist ? "Open Creator Hub" : "Creator Side",
      description: isArtist
        ? "Pick up your release flow where you left off."
        : "Learn how artists submit and get programmed.",
    },
    { href: "/search", label: "Search", description: "Find artists, songs, and pages fast." },
  ];

  function isActive(href: string, matchPrefixes?: readonly string[]) {
    if (href === "/") return pathname === "/";
    if (matchPrefixes) return matchPrefixes.some((prefix) => pathname.startsWith(prefix));
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const creatorActive = creatorMatchPrefixes.some((prefix) => pathname.startsWith(prefix));
  const menuActivePaths = [
    ...LISTENER_LINKS.map((link) => link.href),
    ...HELP_LINKS.map((link) => link.href),
  ];
  const menuIsActive = menuActivePaths.some((href) => pathname.startsWith(href));

  return (
    <>
      {drawerOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}

      <div
        className={`fixed inset-x-0 bottom-[72px] z-50 transition-transform duration-300 ease-out ${
          drawerOpen ? "translate-y-0" : "translate-y-[110%]"
        }`}
      >
        <div className="mx-auto max-w-md rounded-t-[2rem] border border-white/10 bg-[#07111f]/96 px-4 pb-6 pt-4 backdrop-blur-2xl shadow-[0_-20px_60px_rgba(0,0,0,0.5)]">
          <div className="mb-4 flex justify-center">
            <div className="h-1 w-10 rounded-full bg-white/20" />
          </div>

          <div className="mb-4 px-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/35">
              Menu
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Pick the main thing you want to do, then jump into creator tools, listening tools, or account pages.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/25">
                Start Here
              </p>
              <div className="grid gap-2">
                {quickActions.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`rounded-[1.35rem] border px-4 py-3 text-left transition ${
                      pathname.startsWith(link.href)
                        ? "border-cyan-300/24 bg-cyan-300/[0.08] text-white"
                        : "border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/14 hover:text-white"
                    }`}
                  >
                    <p className="text-sm font-semibold">{link.label}</p>
                    {link.description ? (
                      <p className="mt-1 text-xs leading-5 text-inherit/75">{link.description}</p>
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/25">
                Creator
              </p>
              <div className="grid grid-cols-2 gap-2">
                {creatorLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      pathname.startsWith(link.href)
                        ? "border-[#00FF88]/25 bg-[#00FF88]/10 text-white"
                        : "border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/14 hover:text-white"
                    }`}
                  >
                    <p className="text-sm font-semibold">{link.label}</p>
                    {link.description ? (
                      <p className="mt-1 text-[11px] leading-5 text-inherit/75">{link.description}</p>
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/25">
                Listen More
              </p>
              <div className="grid gap-2">
                {LISTENER_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`rounded-[1.2rem] border px-4 py-3 text-left transition ${
                      pathname.startsWith(link.href)
                        ? "border-fuchsia-400/24 bg-fuchsia-400/[0.08] text-white"
                        : "border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/14 hover:text-white"
                    }`}
                  >
                    <p className="text-sm font-semibold">{link.label}</p>
                    {link.description ? (
                      <p className="mt-1 text-xs leading-5 text-inherit/75">{link.description}</p>
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/25">
                Account & Help
              </p>
              <div className="grid grid-cols-2 gap-2">
                {HELP_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex min-h-12 items-center justify-center rounded-2xl border px-4 text-sm font-semibold transition ${
                      pathname.startsWith(link.href)
                        ? "border-white/16 bg-white/[0.08] text-white"
                        : "border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/14 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                {session?.user ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      void signOut({ callbackUrl: "/" });
                    }}
                    className="col-span-2 flex min-h-12 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] px-4 text-sm font-semibold text-slate-300 transition hover:border-white/14 hover:text-red-400"
                  >
                    Sign out
                  </button>
                ) : (
                  <Link
                    href="/signin"
                    onClick={() => setDrawerOpen(false)}
                    className="col-span-2 flex min-h-12 items-center justify-center rounded-2xl border border-[#FF2DA6]/25 bg-[#FF2DA6]/[0.07] px-4 text-sm font-semibold text-[#FF2DA6] transition hover:bg-[#FF2DA6]/[0.13]"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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

          <button
            type="button"
            aria-label="Open app menu"
            onClick={() => setDrawerOpen((open) => !open)}
            className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold transition ${
              drawerOpen || menuIsActive ? "text-[#00e5ff]" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <svg
              aria-hidden="true"
              className={`h-5 w-5 transition-transform duration-200 ${drawerOpen ? "rotate-45" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="uppercase tracking-[0.14em]">Menu</span>
          </button>
        </div>
      </nav>
    </>
  );
}
