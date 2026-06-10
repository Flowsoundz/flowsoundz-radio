"use client";

import { useEffect, useState } from "react";
import type { TipLink } from "@/app/api/radio/tip/route";

interface Props {
  artistSlug: string;
  artistName: string;
  songTitle: string;
  onClose: () => void;
}

const PLATFORM_META: Record<string, { label: string; color: string; emoji: string }> = {
  MEMBERSHIP: { label: "FlowSoundz Membership", color: "from-[#8B5CF6] to-[#FF2DA6]", emoji: "💜" },
  PATREON:    { label: "Patreon",                color: "from-[#FF424D] to-[#E6461A]",  emoji: "🎨" },
  BANDCAMP:   { label: "Bandcamp",               color: "from-[#1da0c3] to-[#629aa9]",  emoji: "🎵" },
  PAYPAL:     { label: "PayPal",                 color: "from-[#003087] to-[#009cde]",  emoji: "💳" },
  CRYPTO:     { label: "Crypto",                 color: "from-[#F7931A] to-[#FFCE00]",  emoji: "₿" },
  TIPJAR:     { label: "Tip Jar",                color: "from-[#00E5FF] to-[#8B5CF6]",  emoji: "☕" },
  OTHER:      { label: "Support",                color: "from-[#8B5CF6] to-[#00E5FF]",  emoji: "♥" },
};

function getPlatformMeta(platform: string) {
  return PLATFORM_META[platform] ?? PLATFORM_META.OTHER;
}

export function TipModal({ artistSlug, artistName, songTitle, onClose }: Props) {
  const [links, setLinks] = useState<TipLink[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch(`/api/radio/tip?slug=${encodeURIComponent(artistSlug)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { links: TipLink[] } | null) => {
        setLinks(data?.links ?? []);
        setLoading(false);
      })
      .catch(() => { setLinks([]); setLoading(false); });
  }, [artistSlug]);

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  const hasLinks = links && links.length > 0;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-sm rounded-[1.8rem] border border-white/10 bg-[#0d1120] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.8)]">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#FF2DA6]/70">
              Tip this track
            </p>
            <h3 className="mt-1 text-lg font-semibold text-[#F8FAFC]">{songTitle}</h3>
            <p className="mt-0.5 text-sm text-[#CBD5E1]">by {artistName}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-[#CBD5E1]/50 transition hover:text-[#F8FAFC]"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Links */}
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#8B5CF6] border-t-transparent" />
          </div>
        ) : hasLinks ? (
          <div className="flex flex-col gap-2.5">
            {links!.map((link, i) => {
              const meta = getPlatformMeta(link.platform);
              const label = link.label ?? meta.label;
              const isInternal = link.url.startsWith("/");
              return (
                <a
                  key={i}
                  href={link.url}
                  target={isInternal ? "_self" : "_blank"}
                  rel={isInternal ? undefined : "noopener noreferrer"}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-[1.2rem] bg-gradient-to-r ${meta.color} p-[1px] transition active:scale-[0.98]`}
                >
                  <div className="flex w-full items-center gap-3 rounded-[calc(1.2rem-1px)] bg-[#0d1120] px-4 py-3 transition hover:bg-[#131c30]">
                    <span className="text-xl">{meta.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#F8FAFC]">{label}</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-[#CBD5E1]/50">
                      <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <p className="mb-1 text-xs text-[#CBD5E1]/60">
              {artistName} hasn&apos;t set up tip links yet — support the station instead:
            </p>
            <a
              href="/support"
              onClick={onClose}
              className="flex items-center gap-3 rounded-[1.2rem] bg-gradient-to-r from-[#8B5CF6] to-[#FF2DA6] p-[1px] transition active:scale-[0.98]"
            >
              <div className="flex w-full items-center gap-3 rounded-[calc(1.2rem-1px)] bg-[#0d1120] px-4 py-3 transition hover:bg-[#131c30]">
                <span className="text-xl">💜</span>
                <p className="text-sm font-semibold text-[#F8FAFC]">Support FlowSoundz Radio</p>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-auto shrink-0 text-[#CBD5E1]/50">
                  <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </a>
          </div>
        )}

        <p className="mt-4 text-center text-[10px] text-[#CBD5E1]/35">
          Tips go directly to the artist
        </p>
      </div>
    </div>
  );
}
