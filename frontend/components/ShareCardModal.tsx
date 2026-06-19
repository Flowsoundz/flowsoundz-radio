"use client";

import { useEffect, useRef, useState } from "react";
import { getSiteUrl } from "@/lib/siteUrl";
import type { Song } from "@/lib/types";

type Props = {
  song: Song;
  onClose: () => void;
};

export function ShareCardModal({ song, onClose }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [shared, setShared] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const coverParam = song.cover_url
    ? `&cover=${encodeURIComponent(song.cover_url)}`
    : song.cover_file
    ? `&cover=${encodeURIComponent(`/covers/${song.cover_file}`)}`
    : "";

  const cardUrl = `/api/share/card?title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}${song.vibe ? `&vibe=${encodeURIComponent(song.vibe)}` : ""}${coverParam}`;
  const radioUrl = `${typeof window !== "undefined" ? window.location.origin : getSiteUrl()}/radio?song=${song.id}`;

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
      a.download = `${song.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-flowsoundz.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // fallback — open in new tab
      window.open(cardUrl, "_blank");
    } finally {
      setDownloading(false);
    }
  }

  async function handleShare() {
    const shareText = `Listening to "${song.title}" by ${song.artist} on FlowSoundz Radio 🎧`;
    try {
      if (navigator.share && navigator.canShare) {
        const res = await fetch(cardUrl);
        const blob = await res.blob();
        const file = new File([blob], "flowsoundz-share.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: shareText, url: radioUrl });
          setShared(true);
          setTimeout(() => setShared(false), 2500);
          void fetch("/api/share/award", { method: "POST" }).catch(() => undefined);
          return;
        }
      }
      // fallback to URL share
      if (navigator.share) {
        await navigator.share({ title: shareText, url: radioUrl });
      } else {
        await navigator.clipboard.writeText(`${shareText} ${radioUrl}`);
      }
      setShared(true);
      setTimeout(() => setShared(false), 2500);
      void fetch("/api/share/award", { method: "POST" }).catch(() => undefined);
    } catch {
      // user cancelled or not supported
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="relative flex w-full max-w-sm flex-col gap-4 rounded-[2rem] border border-white/10 bg-[#07111f] p-5 shadow-[0_0_80px_rgba(0,229,255,0.08)]">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition hover:text-white"
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <p className="text-sm font-semibold text-white/70 uppercase tracking-widest">Share Card</p>

        {/* Preview */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cardUrl}
          alt="Share card preview"
          className="w-full rounded-[1.2rem] border border-white/8"
        />

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={downloading}
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {downloading ? "Saving…" : "Download"}
          </button>
          <button
            type="button"
            onClick={() => void handleShare()}
            className="flex items-center justify-center gap-2 rounded-2xl border border-[#00E5FF]/30 bg-[#00E5FF]/10 px-4 py-3 text-sm font-semibold text-[#00E5FF] transition hover:bg-[#00E5FF]/18"
          >
            {shared ? (
              <>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Shared!
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                Share
              </>
            )}
          </button>
        </div>

        <p className="text-center text-[11px] text-white/25">Post to TikTok, Reels, or Stories</p>
      </div>
    </div>
  );
}
