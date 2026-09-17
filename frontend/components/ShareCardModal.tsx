"use client";

import { useEffect, useRef, useState } from "react";
import { getAttribution } from "@/lib/attribution";
import { track } from "@/lib/analytics";
import { getSiteUrl } from "@/lib/siteUrl";
import type { Song } from "@/lib/types";

type Props = {
  song: Song;
  onClose: () => void;
};

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 64) || "now_playing"
  );
}

export function ShareCardModal({ song, onClose }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [shared, setShared] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const coverParam = song.cover_url
    ? `&cover=${encodeURIComponent(song.cover_url)}`
    : song.cover_file
      ? `&cover=${encodeURIComponent(`/covers/${song.cover_file}`)}`
      : "";

  const cardUrl = `/api/share/card?title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}${song.vibe ? `&vibe=${encodeURIComponent(song.vibe)}` : ""}${coverParam}`;
  const origin = typeof window !== "undefined" ? window.location.origin : getSiteUrl();
  const radioUrl = new URL("/radio", origin);
  const currentAttribution = typeof window === "undefined" ? {} : getAttribution();
  const referral = currentAttribution.ref ?? currentAttribution.fsr_ref;

  radioUrl.searchParams.set("song", song.id);
  radioUrl.searchParams.set("utm_source", "listener_share");
  radioUrl.searchParams.set("utm_medium", "creator_share");
  radioUrl.searchParams.set("utm_campaign", "now_playing");
  radioUrl.searchParams.set("utm_content", slugify(`${song.artist}_${song.title}`));
  if (referral) radioUrl.searchParams.set("ref", referral);

  const shareUrl = radioUrl.toString();
  const shareText = `Listening to "${song.title}" by ${song.artist} on FlowSoundz Radio. Tap in live.`;
  const caption = `${shareText}\n\n${shareUrl}`;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(cardUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(song.title).replace(/_/g, "-")}-flowsoundz.png`;
      a.click();
      URL.revokeObjectURL(url);
      track("share_track_click", {
        action: "download_share_card",
        title: song.title,
        artist: song.artist,
        trackId: song.id,
        source: "share_card",
      });
    } catch {
      window.open(cardUrl, "_blank");
    } finally {
      setDownloading(false);
    }
  }

  async function handleShare() {
    try {
      if (navigator.share && navigator.canShare) {
        const res = await fetch(cardUrl);
        const blob = await res.blob();
        const file = new File([blob], "flowsoundz-share.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: shareText, url: shareUrl });
          setShared(true);
          window.setTimeout(() => setShared(false), 2500);
          track("share_track_click", {
            action: "native_image_share",
            title: song.title,
            artist: song.artist,
            trackId: song.id,
            source: "share_card",
          });
          void fetch("/api/share/award", { method: "POST" }).catch(() => undefined);
          return;
        }
      }

      if (navigator.share) {
        await navigator.share({ title: shareText, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(caption);
      }
      setShared(true);
      window.setTimeout(() => setShared(false), 2500);
      track("share_track_click", {
        action: "native_link_share",
        title: song.title,
        artist: song.artist,
        trackId: song.id,
        source: "share_card",
      });
      void fetch("/api/share/award", { method: "POST" }).catch(() => undefined);
    } catch {
      // User cancelled or sharing is unavailable.
    }
  }

  async function copyCaption() {
    await navigator.clipboard.writeText(caption);
    setCopiedCaption(true);
    window.setTimeout(() => setCopiedCaption(false), 1800);
    track("share_track_click", {
      action: "copy_caption",
      title: song.title,
      artist: song.artist,
      trackId: song.id,
      source: "share_card",
    });
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 1800);
    track("share_track_click", {
      action: "copy_campaign_link",
      title: song.title,
      artist: song.artist,
      trackId: song.id,
      source: "share_card",
    });
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="relative flex w-full max-w-sm flex-col gap-4 rounded-[2rem] border border-white/10 bg-[#07111f] p-5 shadow-[0_0_80px_rgba(0,229,255,0.08)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition hover:text-white"
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-white/70">
            Share Moment
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            A campaign-tagged card and link for Reels, TikTok, Shorts, Stories, or artist reposts.
          </p>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cardUrl}
          alt="Share card preview"
          className="w-full rounded-[1.2rem] border border-white/8"
        />

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={downloading}
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {downloading ? "Saving..." : "Download"}
          </button>
          <button
            type="button"
            onClick={() => void handleShare()}
            className="flex items-center justify-center gap-2 rounded-2xl border border-[#00E5FF]/30 bg-[#00E5FF]/10 px-4 py-3 text-sm font-semibold text-[#00E5FF] transition hover:bg-[#00E5FF]/18"
          >
            {shared ? (
              <>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Shared
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Share
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void copyCaption()}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
          >
            {copiedCaption ? "Caption copied" : "Copy caption"}
          </button>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
          >
            {copiedLink ? "Link copied" : "Copy link"}
          </button>
        </div>

        <p className="break-all rounded-2xl border border-white/8 bg-black/20 p-3 font-mono text-[10px] leading-4 text-cyan-100/65">
          {shareUrl}
        </p>

        <p className="text-center text-[11px] text-white/25">
          Post to TikTok, Reels, Shorts, or Stories
        </p>
      </div>
    </div>
  );
}
