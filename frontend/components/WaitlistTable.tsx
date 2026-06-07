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

type LaunchStatus = "idle" | "confirm" | "sending" | "done" | "error";

function LaunchEmailButton({ count }: { count: number }) {
  const [status, setStatus] = useState<LaunchStatus>("idle");
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function handleSend() {
    setStatus("sending");
    setErr("");
    try {
      const res = await fetch("/api/admin/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_launch", password }),
      });
      const data = await res.json() as { sent?: number; failed?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to send.");
      setResult({ sent: data.sent ?? 0, failed: data.failed ?? 0 });
      setStatus("done");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "done" && result) {
    return (
      <div className="rounded-[1.2rem] border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-3 text-sm text-emerald-300">
        ✓ Launch email sent to {result.sent} member{result.sent === 1 ? "" : "s"}.
        {result.failed > 0 && <span className="ml-2 text-amber-400">{result.failed} failed.</span>}
      </div>
    );
  }

  if (status === "confirm" || status === "sending" || status === "error") {
    return (
      <div className="flex flex-col gap-3 rounded-[1.2rem] border border-amber-400/20 bg-amber-400/[0.06] p-4">
        <p className="text-sm font-semibold text-amber-200">
          Send launch email to all {count} waitlist member{count === 1 ? "" : "s"}?
        </p>
        <p className="text-xs text-amber-300/70">This cannot be undone. Each person gets one email.</p>
        <input
          type="password"
          placeholder="Admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={status === "sending"}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white/20 disabled:opacity-50"
        />
        {err && <p className="text-xs text-red-400">{err}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!password || status === "sending"}
            className="rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
          >
            {status === "sending" ? "Sending…" : "Confirm & Send"}
          </button>
          <button
            type="button"
            onClick={() => { setStatus("idle"); setPassword(""); setErr(""); }}
            disabled={status === "sending"}
            className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-400 hover:text-white disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setStatus("confirm")}
      className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/[0.07] px-4 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-400/[0.12]"
    >
      <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.09 1.18 2 2 0 012.07 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.36-.36a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 15.09v1.83z" />
      </svg>
      Send launch email
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
        <div className="flex flex-wrap gap-2">
          <LaunchEmailButton count={entries.length} />
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
