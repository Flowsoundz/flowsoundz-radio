"use client";

import { useState, useRef } from "react";

type Status = "idle" | "loading" | "success" | "duplicate" | "error";

export function WaitlistForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = inputRef.current?.value.trim() ?? "";
    if (!email) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.status === 201) {
        setStatus("success");
      } else if (res.status === 200) {
        setStatus("duplicate");
      } else {
        const data = (await res.json()) as { error?: string };
        setErrorMsg(data.error ?? "Something went wrong. Try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Could not connect. Check your internet and try again.");
      setStatus("error");
    }
  }

  if (status === "success" || status === "duplicate") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff20,#7c4dff20)] ring-1 ring-[#00e5ff]/30">
          <svg className="h-5 w-5 text-[#00e5ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-sm font-medium text-white">
          {status === "success"
            ? "You're on the list. Welcome to FlowSoundz."
            : "You're already on the list — we'll be in touch."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} noValidate>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <input
          ref={inputRef}
          type="email"
          required
          placeholder="your@email.com"
          autoComplete="email"
          disabled={status === "loading"}
          className="h-12 flex-1 rounded-full border border-white/12 bg-white/[0.05] px-5 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-[#00e5ff]/50 focus:bg-white/[0.07] focus:ring-1 focus:ring-[#00e5ff]/30 disabled:opacity-50 sm:min-w-[260px]"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="h-12 shrink-0 rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-7 text-sm font-bold text-white shadow-[0_0_20px_rgba(0,229,255,0.3)] transition hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === "loading" ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Joining...
            </span>
          ) : (
            "Join Waitlist"
          )}
        </button>
      </div>
      {status === "error" && (
        <p className="mt-3 text-center text-xs text-red-400 sm:text-left">{errorMsg}</p>
      )}
    </form>
  );
}
