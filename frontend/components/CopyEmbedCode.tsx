"use client";

import { useState } from "react";

export function CopyEmbedCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-stretch gap-2">
      <code className="flex-1 rounded-[0.8rem] border border-white/8 bg-white/[0.03] px-3 py-2 text-[10px] text-slate-400 font-mono overflow-hidden text-ellipsis whitespace-nowrap">
        {code}
      </code>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          });
        }}
        className="shrink-0 rounded-[0.8rem] border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-semibold text-slate-300 transition hover:bg-white/10"
      >
        {copied ? "Copied ✓" : "Copy"}
      </button>
    </div>
  );
}
