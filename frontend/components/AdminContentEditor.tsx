"use client";

import { useState } from "react";
import type { SiteContent, CtaVariant } from "@/lib/brand-content";

const CTA_VARIANTS: CtaVariant[] = ["cyan", "ghost", "fuchsia"];

const inputClass =
  "w-full min-h-10 rounded-[0.9rem] border border-white/8 bg-[#111827] px-3 py-2 text-sm text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/40 focus:border-[#00E5FF]/35";

const textareaClass =
  "w-full rounded-[0.9rem] border border-white/8 bg-[#111827] px-3 py-2 text-sm text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/40 focus:border-[#00E5FF]/35 resize-none";

const labelTextClass = "text-xs font-semibold uppercase tracking-[0.18em] text-[#CBD5E1]/60";

const sectionClass =
  "rounded-[1.8rem] border border-white/8 bg-[#0B1020]/86 p-6 space-y-4";

const sectionHeadingClass = "text-sm font-semibold text-[#F8FAFC]/75";

type Status = "idle" | "saving" | "saved" | "error";

export function AdminContentEditor({ initial }: { initial: SiteContent }) {
  const [form, setForm] = useState<SiteContent>(initial);
  const [platformsText, setPlatformsText] = useState(
    initial.trustPlatforms.join(", "),
  );
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function setField<K extends keyof SiteContent>(key: K, value: SiteContent[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateCtaButton(
    index: number,
    field: keyof SiteContent["ctaButtons"][number],
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      ctaButtons: prev.ctaButtons.map((btn, i) =>
        i === index ? { ...btn, [field]: value } : btn,
      ),
    }));
  }

  function updateValueCard(
    index: number,
    field: keyof SiteContent["valueCards"][number],
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      valueCards: prev.valueCards.map((card, i) =>
        i === index ? { ...card, [field]: value } : card,
      ),
    }));
  }

  async function handleSave() {
    setStatus("saving");
    setErrorMsg("");

    const payload: SiteContent = {
      ...form,
      trustPlatforms: platformsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, content: payload }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Save failed");
      }

      setForm(payload);
      setStatus("saved");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div className="space-y-5">
      {/* Password */}
      <div className={sectionClass}>
        <p className={sectionHeadingClass}>Admin password</p>
        <label className="grid gap-1.5">
          <span className={labelTextClass}>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter admin password to save"
            className={inputClass}
          />
        </label>
      </div>

      {/* Brand basics */}
      <div className={sectionClass}>
        <p className={sectionHeadingClass}>Brand basics</p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5">
            <span className={labelTextClass}>Site name</span>
            <input
              type="text"
              value={form.siteName}
              onChange={(e) => setField("siteName", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="grid gap-1.5">
            <span className={labelTextClass}>Tagline</span>
            <input
              type="text"
              value={form.siteTagline}
              onChange={(e) => setField("siteTagline", e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      </div>

      {/* Hero */}
      <div className={sectionClass}>
        <p className={sectionHeadingClass}>Hero section</p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5">
            <span className={labelTextClass}>Logo path</span>
            <input
              type="text"
              value={form.heroLogoSrc}
              onChange={(e) => setField("heroLogoSrc", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="grid gap-1.5">
            <span className={labelTextClass}>Logo alt text</span>
            <input
              type="text"
              value={form.heroLogoAlt}
              onChange={(e) => setField("heroLogoAlt", e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        <label className="grid gap-1.5">
          <span className={labelTextClass}>Hero title</span>
          <input
            type="text"
            value={form.heroTitle}
            onChange={(e) => setField("heroTitle", e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="grid gap-1.5">
          <span className={labelTextClass}>Hero subtitle</span>
          <textarea
            rows={3}
            value={form.heroSubtitle}
            onChange={(e) => setField("heroSubtitle", e.target.value)}
            className={textareaClass}
          />
        </label>
      </div>

      {/* CTA Buttons */}
      <div className={sectionClass}>
        <p className={sectionHeadingClass}>CTA buttons</p>
        <div className="space-y-3">
          {form.ctaButtons.map((btn, i) => (
            <div
              key={i}
              className="grid gap-3 rounded-[1.2rem] border border-white/6 bg-white/[0.02] p-4 md:grid-cols-3"
            >
              <label className="grid gap-1.5">
                <span className={labelTextClass}>Label</span>
                <input
                  type="text"
                  value={btn.label}
                  onChange={(e) => updateCtaButton(i, "label", e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="grid gap-1.5">
                <span className={labelTextClass}>Link</span>
                <input
                  type="text"
                  value={btn.href}
                  onChange={(e) => updateCtaButton(i, "href", e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="grid gap-1.5">
                <span className={labelTextClass}>Color</span>
                <select
                  value={btn.variant}
                  onChange={(e) =>
                    updateCtaButton(i, "variant", e.target.value)
                  }
                  className={inputClass}
                >
                  {CTA_VARIANTS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Value Cards */}
      <div className={sectionClass}>
        <p className={sectionHeadingClass}>Value cards</p>
        <div className="space-y-3">
          {form.valueCards.map((card, i) => (
            <div
              key={i}
              className="grid gap-3 rounded-[1.2rem] border border-white/6 bg-white/[0.02] p-4"
            >
              <label className="grid gap-1.5">
                <span className={labelTextClass}>Title</span>
                <input
                  type="text"
                  value={card.title}
                  onChange={(e) => updateValueCard(i, "title", e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="grid gap-1.5">
                <span className={labelTextClass}>Body</span>
                <textarea
                  rows={2}
                  value={card.text}
                  onChange={(e) => updateValueCard(i, "text", e.target.value)}
                  className={textareaClass}
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Trust strip */}
      <div className={sectionClass}>
        <p className={sectionHeadingClass}>Trust strip</p>
        <label className="grid gap-1.5">
          <span className={labelTextClass}>Strip text</span>
          <textarea
            rows={2}
            value={form.trustStripText}
            onChange={(e) => setField("trustStripText", e.target.value)}
            className={textareaClass}
          />
        </label>
        <label className="grid gap-1.5">
          <span className={labelTextClass}>
            Platforms&nbsp;
            <span className="normal-case tracking-normal text-[#CBD5E1]/40">
              (comma-separated)
            </span>
          </span>
          <input
            type="text"
            value={platformsText}
            onChange={(e) => setPlatformsText(e.target.value)}
            placeholder="Spotify, Apple Music, YouTube"
            className={inputClass}
          />
        </label>
      </div>

      {/* Footer */}
      <div className={sectionClass}>
        <p className={sectionHeadingClass}>Footer</p>
        <label className="grid gap-1.5">
          <span className={labelTextClass}>Tagline</span>
          <input
            type="text"
            value={form.footerTagline}
            onChange={(e) => setField("footerTagline", e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      {/* Save */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {status === "saved" && (
            <p className="text-sm text-emerald-300">
              Saved — homepage will reflect changes on next load.
            </p>
          )}
          {status === "error" && (
            <p className="text-sm text-rose-300">{errorMsg}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={status === "saving" || !password}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-300/10 px-6 text-sm font-semibold text-cyan-50 transition hover:border-cyan-300/40 hover:bg-cyan-300/16 disabled:border-white/8 disabled:bg-white/5 disabled:text-white/30"
        >
          {status === "saving" ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
