"use client";

import { useState } from "react";
import type { ContactMessage } from "@/app/admin/contact/page";

const TOPIC_LABELS: Record<string, string> = {
  artist: "Artist Submission",
  partnership: "Partnership",
  general: "General",
};

const TOPIC_COLORS: Record<string, string> = {
  artist: "#00e5ff",
  partnership: "#7c4dff",
  general: "#ff2da6",
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

function MessageRow({
  msg,
  onMarkRead,
}: {
  msg: ContactMessage;
  onMarkRead: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [marking, setMarking] = useState(false);
  const accent = TOPIC_COLORS[msg.topic] ?? "#64748b";

  const handleMarkRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMarking(true);
    try {
      await fetch(`/api/contact/${msg.id}`, { method: "PATCH" });
      onMarkRead(msg.id);
    } finally {
      setMarking(false);
    }
  };

  return (
    <div
      className={`border-b border-white/5 last:border-0 transition-colors ${expanded ? "bg-white/[0.02]" : ""}`}
    >
      {/* Row header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-4 px-5 py-4 text-left"
      >
        {/* Unread dot */}
        <div className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center">
          {msg.status === "unread" ? (
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: accent, boxShadow: `0 0 6px ${accent}` }}
            />
          ) : (
            <span className="h-2 w-2 rounded-full bg-white/15" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-sm font-semibold ${msg.status === "unread" ? "text-white" : "text-slate-400"}`}>
              {msg.name}
            </span>
            <span className="text-xs text-slate-500">{msg.email}</span>
            <span
              className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em]"
              style={{ color: accent, borderColor: `${accent}40`, background: `${accent}12` }}
            >
              {TOPIC_LABELS[msg.topic] ?? msg.topic}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {formatDate(msg.received_at)}
          </p>
          {!expanded && (
            <p className="mt-1 truncate text-sm text-slate-400">{msg.message}</p>
          )}
        </div>

        <svg
          className={`mt-1 h-4 w-4 shrink-0 text-slate-600 transition-transform ${expanded ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-5 pb-5 pl-14">
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
            {msg.message}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a
              href={`mailto:${msg.email}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-4 py-2 text-xs font-bold text-white shadow-[0_0_14px_rgba(0,229,255,0.25)] transition hover:shadow-[0_0_22px_rgba(0,229,255,0.4)]"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Reply to {msg.email}
            </a>
            {msg.status === "unread" && (
              <button
                type="button"
                onClick={(e) => void handleMarkRead(e)}
                disabled={marking}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-xs font-medium text-white/60 transition hover:border-white/20 hover:text-white disabled:opacity-50"
              >
                {marking ? "Marking..." : "Mark as read"}
              </button>
            )}
            <span className="text-xs text-slate-600 font-mono">{msg.id}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function ContactInbox({ messages }: { messages: ContactMessage[] }) {
  const [items, setItems] = useState(messages);

  const handleMarkRead = (id: string) => {
    setItems((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: "read" as const } : m)),
    );
  };

  if (items.length === 0) {
    return (
      <div className="glass-card rounded-[1.8rem] p-10 text-center text-sm text-slate-400">
        No messages yet. Share the contact page to start receiving inquiries.
      </div>
    );
  }

  const unread = items.filter((m) => m.status === "unread").length;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          <span className="font-semibold text-white">{items.length}</span>{" "}
          message{items.length === 1 ? "" : "s"}
          {unread > 0 && (
            <span className="ml-2 rounded-full bg-[#00e5ff]/15 px-2 py-0.5 text-xs font-semibold text-[#00e5ff]">
              {unread} unread
            </span>
          )}
        </p>
      </div>

      {/* Message list */}
      <div className="glass-card overflow-hidden rounded-[1.6rem]">
        {items.map((msg) => (
          <MessageRow key={msg.id} msg={msg} onMarkRead={handleMarkRead} />
        ))}
      </div>
    </div>
  );
}
