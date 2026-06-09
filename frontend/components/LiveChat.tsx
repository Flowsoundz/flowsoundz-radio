"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage, ChatRole } from "@/lib/chatStore";

const ROLE_BADGE: Record<ChatRole, { label: string; className: string } | null> = {
  ADMIN:    { label: "ADMIN",    className: "border-[#ef4444]/40 text-[#fca5a5] bg-[#ef4444]/10" },
  ARTIST:   { label: "ARTIST",  className: "border-[#00E5FF]/40 text-[#00E5FF] bg-[#00E5FF]/10" },
  VAULT:    { label: "VAULT",   className: "border-[#8B5CF6]/40 text-[#c4b5fd] bg-[#8B5CF6]/10" },
  INSIDER:  { label: "INSIDER", className: "border-[#22c55e]/30 text-[#86efac] bg-[#22c55e]/08" },
  LISTENER: null,
};

function RoleBadge({ role }: { role: ChatRole }) {
  const badge = ROLE_BADGE[role];
  if (!badge) return null;
  return (
    <span className={`rounded-full border px-1.5 py-0 text-[8px] font-bold tracking-widest ${badge.className}`}>
      {badge.label}
    </span>
  );
}

const POLL_MS = 2500;
const NAME_KEY = "fsz-chat-name";

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

type Props = {
  currentTrackTitle?: string | null;
  onClose: () => void;
};

export function LiveChat({ currentTrackTitle, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [name, setName] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(NAME_KEY) ?? "";
  });
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [showNameEdit, setShowNameEdit] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const isAtBottomRef = useRef(true);

  function saveName(n: string) {
    setName(n);
    window.localStorage.setItem(NAME_KEY, n);
  }

  // Polling
  useEffect(() => {
    let mounted = true;

    async function poll() {
      try {
        const res = await fetch("/api/chat");
        const data = (await res.json()) as { messages?: ChatMessage[] };
        if (mounted && data.messages) {
          setMessages(data.messages);
        }
      } catch {
        // silently retry
      }
    }

    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive (only if already at bottom)
  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  function handleScroll() {
    const el = listRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    setSendError("");

    const displayName = name.trim() || "Listener";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          text: text.trim(),
          trackTitle: currentTrackTitle ?? null,
        }),
      });
      const data = (await res.json()) as { message?: ChatMessage; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to send.");
      saveName(displayName);
      setText("");
      if (data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message!.id)) return prev;
          return [...prev, data.message!];
        });
        isAtBottomRef.current = true;
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel — slide up on mobile, slide in from right on desktop */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[82vh] flex-col rounded-t-[2rem] border-t border-white/10 bg-[#080f1e]/97 shadow-[0_-24px_80px_rgba(0,0,0,0.7)] sm:bottom-auto sm:right-0 sm:top-0 sm:h-screen sm:max-h-screen sm:w-[360px] sm:rounded-none sm:rounded-l-[2rem] sm:border-l sm:border-t-0 sm:shadow-[-24px_0_80px_rgba(0,0,0,0.5)]">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
              <p className="text-sm font-semibold text-white">Live Chat</p>
            </div>
            {currentTrackTitle && (
              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                Now playing: {currentTrackTitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-slate-400 transition hover:border-white/20 hover:text-white"
            aria-label="Close chat"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Message list */}
        <div
          ref={listRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-3"
        >
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-center text-sm text-slate-600">
                No messages yet.<br />Be the first to say something.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((msg) => (
                <div key={msg.id} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-cyan-300/80">
                      {msg.displayName}
                    </span>
                    <RoleBadge role={msg.role} />
                    {msg.trackTitle && (
                      <span className="truncate text-[10px] text-slate-600">
                        on &ldquo;{msg.trackTitle}&rdquo;
                      </span>
                    )}
                    <span className="ml-auto shrink-0 text-[10px] text-slate-700">
                      {timeAgo(msg.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm leading-5 text-slate-300">{msg.text}</p>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Name edit row */}
        {showNameEdit && (
          <div className="shrink-0 border-t border-white/8 px-4 py-2">
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={32}
                placeholder="Display name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white outline-none focus:border-white/20"
              />
              <button
                type="button"
                onClick={() => {
                  saveName(name);
                  setShowNameEdit(false);
                }}
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:border-white/20 hover:text-white"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Quick reacts */}
        {currentTrackTitle && (
          <div className="shrink-0 border-t border-white/8 px-4 py-2">
            <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-slate-600">
              React to &ldquo;{currentTrackTitle}&rdquo;
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { emoji: "🔥", label: "this goes hard" },
                { emoji: "❤️", label: "love this one" },
                { emoji: "🎵", label: "vibing to this" },
                { emoji: "👀", label: "first time hearing this" },
                { emoji: "🤯", label: "this is crazy" },
                { emoji: "😮‍💨", label: "needed this today" },
              ].map(({ emoji, label }) => (
                <button
                  key={label}
                  type="button"
                  disabled={sending}
                  onClick={() => {
                    setText(`${emoji} ${label}`);
                  }}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white disabled:opacity-40"
                >
                  {emoji} {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={(e) => void handleSend(e)}
          className="shrink-0 border-t border-white/8 p-4"
        >
          {sendError && (
            <p className="mb-2 text-xs text-red-400">{sendError}</p>
          )}
          <div className="flex gap-2">
            <div className="flex flex-1 items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 pr-1 focus-within:border-white/18">
              <button
                type="button"
                onClick={() => setShowNameEdit((v) => !v)}
                className="shrink-0 text-[10px] font-semibold text-cyan-400/70 transition hover:text-cyan-300"
                title="Change display name"
              >
                {name.trim() || "Listener"}
              </button>
              <span className="text-slate-700">·</span>
              <input
                type="text"
                maxLength={200}
                placeholder="Say something…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-slate-600"
              />
            </div>
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] text-white shadow-[0_0_14px_rgba(0,229,255,0.3)] transition disabled:opacity-40 hover:shadow-[0_0_22px_rgba(0,229,255,0.5)]"
              aria-label="Send"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-700">
            {text.length}/200 · messages are public
          </p>
        </form>
      </div>
    </>
  );
}
