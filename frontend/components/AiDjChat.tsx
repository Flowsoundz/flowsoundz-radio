"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

type Props = {
  djName: string;
  djTone: string;
  vibe: string;
  currentSongTitle?: string;
  currentSongArtist?: string;
};

export function AiDjChat({
  djName,
  djTone,
  vibe,
  currentSongTitle,
  currentSongArtist,
}: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");
    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const res = await fetch("/api/ai-dj", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          djName,
          djTone,
          vibe,
          currentSongTitle,
          currentSongArtist,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error("request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: reply };
          return updated;
        });
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Lost the signal for a sec — try again.",
        };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  const djInitial = djName.charAt(0).toUpperCase();

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-[136px] right-4 z-50 flex w-[min(calc(100vw-2rem),22rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#080f20]/95 shadow-[0_24px_80px_rgba(0,0,0,0.7)] backdrop-blur-2xl sm:bottom-[152px]">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff,#7c4dff)] text-xs font-bold text-white">
              {djInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{djName}</p>
              <p className="text-[10px] text-white/40">
                Live on FlowSoundz ·{" "}
                <span className="capitalize">{vibe.replace("_", " ")}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 transition hover:bg-white/8 hover:text-white"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex h-72 flex-col gap-3 overflow-y-auto p-4 scrollbar-none"
          >
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/8 bg-[linear-gradient(135deg,rgba(0,229,255,0.12),rgba(124,77,255,0.12))]">
                  <svg
                    className="h-5 w-5 text-[#00E5FF]/70"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white/60">
                    Say hey to {djName}
                  </p>
                  <p className="mt-1 text-[10px] text-white/30">
                    Ask what&apos;s playing, switch vibes, or just vibe out
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {msg.role === "assistant" && (
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff,#7c4dff)] text-[10px] font-bold text-white">
                    {djInitial}
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-5 ${
                    msg.role === "assistant"
                      ? "rounded-tl-sm bg-white/[0.06] text-white/90"
                      : "rounded-tr-sm bg-[#00E5FF]/12 text-[#00E5FF]"
                  }`}
                >
                  {msg.content ? (
                    msg.content
                  ) : streaming && i === messages.length - 1 ? (
                    <span className="inline-flex gap-1 py-0.5">
                      <span
                        className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-white/40"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-white/40"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-white/40"
                        style={{ animationDelay: "300ms" }}
                      />
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="border-t border-white/8 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Talk to ${djName}...`}
                disabled={streaming}
                maxLength={200}
                className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-[#00E5FF]/40 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={!input.trim() || streaming}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00E5FF] text-[#050816] transition hover:bg-[#00E5FF]/85 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg
                  className="h-3.5 w-3.5 translate-x-px"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating toggle button */}
      <button
        type="button"
        aria-label={open ? "Close DJ chat" : `Chat with ${djName}`}
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-200 sm:bottom-24 ${
          open
            ? "bg-white/[0.08] text-white ring-1 ring-white/12"
            : "bg-[linear-gradient(135deg,#00e5ff,#7c4dff)] text-white shadow-[0_0_20px_rgba(0,229,255,0.35)]"
        }`}
      >
        {open ? (
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </>
  );
}
