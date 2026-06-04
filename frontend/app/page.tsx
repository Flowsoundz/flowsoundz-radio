import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { HomepageCtaGroup } from "@/components/HomepageCtaGroup";
import { HomepageSocialProof } from "@/components/HomepageSocialProof";
import NowPlayingWidget from "@/components/NowPlayingWidget";
import { getHomepageContent } from "@/lib/homepage-content";
import { WaitlistForm } from "@/components/WaitlistForm";

// [height%, duration(s), delay(s)]
const EQ_BARS: [number, number, number][] = [
  [35, 1.1, 0.0],  [62, 1.4, 0.15], [80, 1.2, 0.30], [54, 1.6, 0.05],
  [90, 1.3, 0.45], [70, 1.5, 0.20], [45, 1.1, 0.35], [85, 1.7, 0.10],
  [65, 1.2, 0.50], [75, 1.4, 0.25], [50, 1.6, 0.40], [88, 1.1, 0.15],
  [62, 1.3, 0.55], [78, 1.5, 0.08], [42, 1.2, 0.32], [92, 1.4, 0.48],
  [58, 1.6, 0.18], [72, 1.1, 0.38], [48, 1.3, 0.58], [66, 1.5, 0.12],
];

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Radio", href: "/radio" },
  { label: "Songs", href: "/songs" },
  { label: "Artists", href: "/artists" },
  { label: "Visualizer", href: "/visualizer" },
  { label: "Membership", href: "/membership" },
  { label: "For Artists", href: "/for-artists" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const COMMUNITY_LINKS = [
  { label: "Instagram", href: "https://www.instagram.com/flowsoundzradio/" },
  { label: "TikTok", href: "https://www.tiktok.com/@flowsoundzradio" },
  { label: "YouTube", href: "https://www.youtube.com/@flowsoundzradio" },
];


export default async function HomePage() {
  const { siteName, heroSubtitle, ctaButtons, valueCards, trustStripText, footerTagline } =
    await getHomepageContent();

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:gap-6 sm:px-6">
          <Link href="/" className="flex items-center">
            <Image
              src="/FSRLogo.svg"
              alt="FlowSoundz Radio"
              width={160}
              height={44}
              className="h-[44px] w-auto"
              style={{
                filter:
                  "brightness(1.3) drop-shadow(0 0 10px rgba(0,230,255,0.35))",
              }}
            />
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-white/50 transition hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/radio"
            className="hidden md:inline-flex items-center justify-center text-sm font-medium text-white transition hover:bg-white/[0.06]"
            style={{ border: "1.5px solid white", borderRadius: "999px", padding: "8px 20px" }}
          >
            Listen Now
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-7xl px-4 pb-4 pt-10 sm:px-6 lg:pb-6 lg:pt-14">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
          {/* Left — copy */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-400">
              CURATED DISCOVERY RADIO
            </p>
            <h1 className="mt-4 font-headline text-[clamp(40px,7vw,88px)] font-black uppercase leading-[0.92] tracking-tight">
              UNDERGROUND
              <br />
              DISCOVERY,
              <br />
              <span className="text-[#00e5ff]">PROGRAMMED</span>{" "}
              <span className="text-[#7c4dff]">LIKE RADIO.</span>
            </h1>
            <p className="mt-6 max-w-md text-sm leading-7 text-white/50 sm:text-[0.95rem]">
              {heroSubtitle}
            </p>
            <p className="mt-4 max-w-md text-sm leading-7 text-white/35 sm:text-[0.95rem]">
              FlowSoundz turns unknown songs into curated discovery moments.
            </p>
            <HomepageCtaGroup ctaButtons={ctaButtons} />
          </div>

          {/* Right — logo + EQ bars stacked */}
          <div className="flex flex-col items-center gap-5 sm:gap-6">
            {/* Logo */}
            <Image
              src="/FSRLogo.svg"
              alt="FlowSoundz Radio"
              width={540}
              height={540}
              sizes="(max-width: 1024px) 100vw, 540px"
              className="h-auto w-full max-w-[540px]"
              style={{
                mixBlendMode: "screen",
                filter: "drop-shadow(0 0 28px rgba(0,230,255,0.4))",
              }}
            />
            {/* EQ bars */}
            <div className="relative flex h-[180px] w-full items-end justify-center gap-[3px] overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.015] px-4 py-5 sm:px-6 sm:py-6 lg:h-[246px]">
              {EQ_BARS.map(([h, dur, delay], i) => (
                <div
                  key={i}
                  className="eq-bar flex-1 rounded-sm"
                  style={{
                    height: `${h}%`,
                    animationDuration: `${dur}s`,
                    animationDelay: `${delay}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <NowPlayingWidget />

      {/* ── Social proof ── */}
      <section className="border-y border-white/[0.06] py-5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <HomepageSocialProof />
          <p className="mt-4 text-center text-sm font-medium text-white/65">
            {trustStripText}
          </p>
        </div>
      </section>

      {/* ── Platforms ── */}
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <p className="mb-1 text-sm font-medium text-white/55">
            Discover on FlowSoundz. Support artists on your favorite platforms.
          </p>
          <p className="mb-5 text-[11px] text-white/25">
            We play the records first — follow them wherever they go.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://open.spotify.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#1DB954]/30 bg-[#1DB954]/10 px-4 py-2 text-xs font-semibold text-[#1DB954] transition hover:bg-[#1DB954]/18 sm:px-6 sm:py-2.5"
            >
              <SpotifyIcon />
              Spotify
            </a>
            <a
              href="https://music.apple.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#fc3c44]/30 bg-[#fc3c44]/10 px-4 py-2 text-xs font-semibold text-[#fc3c44] transition hover:bg-[#fc3c44]/18 sm:px-6 sm:py-2.5"
            >
              <AppleMusicIcon />
              Apple Music
            </a>
            <a
              href="https://www.youtube.com/@flowsoundzradio"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#FF0000]/30 bg-[#FF0000]/10 px-4 py-2 text-xs font-semibold text-[#FF4444] transition hover:bg-[#FF0000]/18 sm:px-6 sm:py-2.5"
            >
              <YouTubeIcon />
              YouTube
            </a>
          </div>
        </div>
      </section>

      {/* ── Waitlist ── */}
      <section className="relative overflow-hidden py-16 sm:py-20">
        {/* Ambient glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-64 w-96 -translate-x-1/2 rounded-full bg-[#00e5ff]/6 blur-[90px]" />
          <div className="absolute bottom-0 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-[#7c4dff]/8 blur-[80px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-400">
              Early Access
            </p>
            <h2 className="mt-3 font-headline text-[clamp(28px,4vw,48px)] font-black uppercase leading-tight tracking-tight text-white">
              Get Early Access
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/50">
              Be the first to know when new features, drops, and artist exclusives go live.
            </p>
            <div className="mt-8">
              <WaitlistForm />
            </div>
            <p className="mt-4 text-[11px] text-white/25">
              No spam. Unsubscribe any time.
            </p>
          </div>
        </div>
      </section>

      {/* ── Bottom strip ── */}
      <div style={{ height: "1px", background: "linear-gradient(90deg, rgba(0,230,255,0.4) 0%, rgba(124,77,255,0.4) 100%)" }} />
      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-white/[0.07]">
            <FeatureItem
              icon={<RadioIcon />}
              title={valueCards[0]?.title?.toUpperCase() ?? "UNDERGROUND DISCOVERY"}
              desc={valueCards[0]?.text ?? ""}
            />
            <FeatureItem
              icon={<MusicNoteIcon />}
              title={valueCards[1]?.title?.toUpperCase() ?? "WHY LISTENERS USE IT"}
              desc={valueCards[1]?.text ?? ""}
            />
            <FeatureItem
              icon={<StarIcon />}
              title="TRANSPARENT CURATION"
              desc="No fake streams. No empty playlist promises. FlowSoundz is curated with clear standards."
            />
            <FeatureItem
              icon={<MicIcon />}
              title={valueCards[2]?.title?.toUpperCase() ?? "WHY ARTISTS SUBMIT"}
              desc={valueCards[2]?.text ?? ""}
            />
          </div>
        </div>
      </section>

      {/* ── Membership teaser ── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-400">MEMBERSHIP</p>
            <h2 className="mt-3 font-headline text-[clamp(32px,4.5vw,56px)] uppercase leading-tight tracking-tight text-white">
              Pick Your Lane
            </h2>
            <p className="mt-3 text-sm text-white/45">Start free. Upgrade when you&apos;re ready.</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {/* Free */}
            <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Free</p>
              <div className="mt-3 flex items-end gap-1">
                <span className="font-headline text-5xl text-white">$0</span>
                <span className="mb-1 text-sm text-white/35">/mo</span>
              </div>
              <p className="mt-2 text-sm text-white/40">For casual listeners.</p>
              <ul className="mt-6 flex flex-col gap-3">
                <PricingFeature text="Full access to 24/7 radio stream" />
                <PricingFeature text="Browse artist profiles" />
                <PricingFeature text="Public show schedule" />
                <PricingFeature text="Community playlist access" />
              </ul>
              <Link
                href="/radio"
                className="mt-8 inline-flex w-full items-center justify-center rounded-full border border-white/20 py-3 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/[0.05]"
              >
                Start Listening
              </Link>
            </div>

            {/* Insider — highlighted */}
            <div className="relative flex flex-col rounded-2xl border border-[#00e5ff]/30 bg-[linear-gradient(145deg,rgba(0,229,255,0.06),rgba(124,77,255,0.06))] p-8 shadow-[0_0_40px_rgba(0,229,255,0.08)]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-[linear-gradient(135deg,#00e5ff,#7c4dff)] px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                  Most Popular
                </span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Insider</p>
              <div className="mt-3 flex items-end gap-1">
                <span className="font-headline text-5xl text-white">$7.99</span>
                <span className="mb-1 text-sm text-white/35">/mo</span>
              </div>
              <p className="mt-2 text-sm text-white/40">The discovery sweet spot.</p>
              <ul className="mt-6 flex flex-col gap-3">
                <PricingFeature text="Everything in Free" highlighted />
                <PricingFeature text="Day One Access — before Public Friday" highlighted />
                <PricingFeature text="Behind the Mix — creator context" highlighted />
                <PricingFeature text="Priority Midnight Drop access" highlighted />
              </ul>
              <Link
                href="/membership#early-access"
                className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff,#7c4dff)] py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(0,229,255,0.4)] transition hover:shadow-[0_0_28px_rgba(0,229,255,0.6)]"
              >
                Get Notified
              </Link>
            </div>

            {/* Vault */}
            <div className="flex flex-col rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/[0.03] p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-400">Vault</p>
              <div className="mt-3 flex items-end gap-1">
                <span className="font-headline text-5xl text-white">$14.99</span>
                <span className="mb-1 text-sm text-white/35">/mo</span>
              </div>
              <p className="mt-2 text-sm text-white/40">For listeners who want everything.</p>
              <ul className="mt-6 flex flex-col gap-3">
                <PricingFeature text="Everything in Insider" />
                <PricingFeature text="Full Vault — exclusive records" />
                <PricingFeature text="Earliest Midnight Drop entry" />
                <PricingFeature text="Founder Circle status" />
              </ul>
              <Link
                href="/membership#early-access"
                className="mt-8 inline-flex w-full items-center justify-center rounded-full border border-fuchsia-400/35 py-3 text-sm font-semibold text-fuchsia-200 transition hover:border-fuchsia-400/55 hover:bg-fuchsia-400/[0.08]"
              >
                Get Notified
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06] px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex flex-col items-center gap-2 md:items-start">
            <span className="font-display text-sm font-semibold tracking-[0.06em] text-white/45">
              {siteName}
            </span>
            <p className="text-xs text-white/28">{footerTagline}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {COMMUNITY_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65 transition hover:border-cyan-300/25 hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </footer>

      <BottomNav />
    </div>
  );
}

// ── Small components ────────────────────────────────────────────────────────

function FeatureItem({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col gap-3 lg:px-8 lg:first:pl-0 lg:last:pr-0">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] text-cyan-400">
        {icon}
      </div>
      <h3 className="font-display text-sm font-bold uppercase tracking-[0.1em] text-white">{title}</h3>
      <p className="text-sm leading-6 text-white/40">{desc}</p>
    </div>
  );
}

function PricingFeature({ text, highlighted }: { text: string; highlighted?: boolean }) {
  return (
    <li className="flex items-start gap-2.5">
      <svg className={`mt-0.5 h-4 w-4 shrink-0 ${highlighted ? "text-cyan-400" : "text-white/30"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span className={`text-sm leading-5 ${highlighted ? "text-white/70" : "text-white/45"}`}>{text}</span>
    </li>
  );
}

function SpotifyIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

function AppleMusicIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.72 3.77a3.52 3.52 0 0 1 2.51-1.1A3.75 3.75 0 0 1 19 5.56a3.08 3.08 0 0 1-2.37.97 3.48 3.48 0 0 1 1.09-2.76Zm2.04 3.44c-1.49-.09-2.75.85-3.46.85-.72 0-1.81-.81-2.97-.79-1.53.03-2.95.89-3.73 2.23-1.6 2.76-.4 6.85 1.13 9.06.75 1.08 1.63 2.3 2.79 2.25 1.1-.05 1.52-.71 2.86-.71 1.35 0 1.73.71 2.88.68 1.2-.02 1.95-1.08 2.69-2.17.86-1.24 1.22-2.45 1.24-2.51-.03 0-2.38-.91-2.41-3.62-.02-2.27 1.84-3.36 1.92-3.42-1.05-1.54-2.67-1.7-2.94-1.73Z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function RadioIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
      <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
      <circle cx="12" cy="12" r="2" />
      <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
      <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
    </svg>
  );
}

function MusicNoteIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path d="M19 10v2a7 7 0 01-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
