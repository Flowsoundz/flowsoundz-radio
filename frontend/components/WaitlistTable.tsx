"use client";

import { useState } from "react";

type WaitlistEntry = {
  id: string;
  email: string;
  joined_at: string;
  source: string;
};

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function CopyButton({ emails }: { emails: string[] }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(emails.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
    >
      {copied ? (
        <>
          <svg className="h-3.5 w-3.5 text-[#00e5ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          Copy all emails
        </>
      )}
    </button>
  );
}

function ExportButton({ entries }: { entries: WaitlistEntry[] }) {
  const handleExport = () => {
    const rows = [
      ["ID", "Email", "Joined At", "Source"],
      ...entries.map((e) => [e.id, e.email, e.joined_at, e.source]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Export CSV
    </button>
  );
}

export function WaitlistTable({ entries }: { entries: WaitlistEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="glass-card rounded-[1.8rem] p-10 text-center text-sm text-slate-400">
        No signups yet. Share the homepage to start building your list.
      </div>
    );
  }

  const emails = entries.map((e) => e.email);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          <span className="font-semibold text-white">{entries.length}</span> signup{entries.length === 1 ? "" : "s"}
        </p>
        <div className="flex gap-2">
          <CopyButton emails={emails} />
          <ExportButton entries={entries} />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden rounded-[1.6rem]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5 hidden sm:table-cell">Joined</th>
                <th className="px-5 py-3.5 hidden md:table-cell">ID</th>
                <th className="px-5 py-3.5 hidden md:table-cell">Source</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={entry.id}
                  className={`border-b border-white/5 last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.015]"}`}
                >
                  <td className="px-5 py-3.5 font-medium text-white">{entry.email}</td>
                  <td className="px-5 py-3.5 text-slate-400 hidden sm:table-cell whitespace-nowrap">
                    {formatDate(entry.joined_at)}
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[11px] text-slate-500">
                      {entry.id}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">{entry.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
