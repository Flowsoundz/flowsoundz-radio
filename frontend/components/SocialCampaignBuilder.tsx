"use client";

import { useMemo, useState } from "react";

const SOURCES = ["instagram", "tiktok", "youtube", "artist", "email", "direct"];
const MEDIUMS = ["organic_social", "creator_share", "email", "paid_social"];

export function SocialCampaignBuilder() {
  const [source, setSource] = useState("instagram");
  const [medium, setMedium] = useState("organic_social");
  const [campaign, setCampaign] = useState("launch");
  const [content, setContent] = useState("now_playing_01");
  const [destination, setDestination] = useState("/radio");
  const [copied, setCopied] = useState(false);

  const link = useMemo(() => {
    if (typeof window === "undefined") return "";

    const url = new URL(destination || "/radio", window.location.origin);
    url.searchParams.set("utm_source", source);
    url.searchParams.set("utm_medium", medium);
    url.searchParams.set("utm_campaign", campaign || "launch");
    url.searchParams.set("utm_content", content || "post_01");
    return url.toString();
  }, [campaign, content, destination, medium, source]);

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="glass-card rounded-[1.6rem] border border-cyan-300/20 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
            Social operations
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">Campaign link builder</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Create one trackable link for each post, artist repost, email, or paid test.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void copyLink()}
          disabled={!link}
          className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs text-slate-400">
          Source
          <select value={source} onChange={(event) => setSource(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white">
            {SOURCES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-400">
          Medium
          <select value={medium} onChange={(event) => setMedium(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white">
            {MEDIUMS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-400">
          Campaign
          <input value={campaign} onChange={(event) => setCampaign(event.target.value.replace(/[^a-z0-9_-]/gi, "").toLowerCase())} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white" placeholder="artist_focus_2026_09" />
        </label>
        <label className="text-xs text-slate-400">
          Content
          <input value={content} onChange={(event) => setContent(event.target.value.replace(/[^a-z0-9_-]/gi, "").toLowerCase())} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white" placeholder="reel_01" />
        </label>
        <label className="text-xs text-slate-400">
          Destination
          <input value={destination} onChange={(event) => setDestination(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white" placeholder="/radio" />
        </label>
      </div>

      <output className="mt-4 block break-all rounded-xl border border-white/8 bg-black/20 p-3 font-mono text-xs leading-5 text-cyan-100/80">
        {link || "Enter a destination to generate a campaign link."}
      </output>
    </div>
  );
}
