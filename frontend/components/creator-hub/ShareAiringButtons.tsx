"use client";

import { useState } from "react";

export function ShareAiringButtons({
  trackTitle,
  airingLabel,
  siteUrl,
}: {
  trackTitle: string;
  airingLabel: string;
  siteUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const message = `🎙️ My track "${trackTitle}" airs LIVE on @flowsoundzradio — ${airingLabel}. It's synchronized radio: tune in WITH me and fire a 🔥 ${siteUrl}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full bg-gradient-to-r from-[#00e5ff] to-[#00FF88] px-4 py-2 text-xs font-bold text-[#04110b] transition hover:brightness-110"
      >
        Tell your fans →
      </a>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(message).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          });
        }}
        className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/25"
      >
        {copied ? "Copied ✓" : "Copy post"}
      </button>
    </div>
  );
}
