"use client";

import { useState, useRef } from "react";

type Status = "idle" | "loading" | "success" | "error";

const TOPICS = [
  { value: "artist", label: "Artist Submission" },
  { value: "partnership", label: "Partnership / Sponsorship" },
  { value: "general", label: "General Inquiry" },
];

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const topicRef = useRef<HTMLSelectElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameRef.current?.value ?? "",
          email: emailRef.current?.value ?? "",
          topic: topicRef.current?.value ?? "",
          message: messageRef.current?.value ?? "",
        }),
      });

      if (res.status === 201) {
        setStatus("success");
      } else {
        const data = (await res.json()) as { error?: string };
        setErrorMsg(data.error ?? "Something went wrong. Try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Could not connect. Check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="glass-card flex flex-col items-center gap-4 rounded-[1.6rem] p-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff20,#7c4dff20)] ring-1 ring-[#00e5ff]/30">
          <svg className="h-6 w-6 text-[#00e5ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <p className="text-base font-semibold text-white">Message received.</p>
          <p className="mt-1 text-sm text-slate-400">We read every message and will get back to you soon.</p>
        </div>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-[0.9rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition focus:border-[#00e5ff]/40 focus:bg-white/[0.06] focus:ring-1 focus:ring-[#00e5ff]/20 disabled:opacity-50";

  return (
    <form onSubmit={(e) => void handleSubmit(e)} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            Name
          </label>
          <input
            ref={nameRef}
            type="text"
            required
            placeholder="Your name"
            autoComplete="name"
            disabled={status === "loading"}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            Email
          </label>
          <input
            ref={emailRef}
            type="email"
            required
            placeholder="your@email.com"
            autoComplete="email"
            disabled={status === "loading"}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
          Topic
        </label>
        <select
          ref={topicRef}
          required
          defaultValue="general"
          disabled={status === "loading"}
          className={`${inputClass} appearance-none`}
        >
          {TOPICS.map((t) => (
            <option key={t.value} value={t.value} className="bg-[#07111f]">
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
          Message
        </label>
        <textarea
          ref={messageRef}
          required
          rows={5}
          placeholder="What's on your mind?"
          disabled={status === "loading"}
          className={`${inputClass} resize-none`}
        />
      </div>

      {status === "error" && (
        <p className="text-xs text-red-400">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="h-12 w-full rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] text-sm font-bold text-white shadow-[0_0_20px_rgba(0,229,255,0.25)] transition hover:shadow-[0_0_30px_rgba(0,229,255,0.45)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-10"
      >
        {status === "loading" ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Sending...
          </span>
        ) : (
          "Send Message"
        )}
      </button>
    </form>
  );
}
