"use client";

import { useMemo, useState } from "react";

const inputClass =
  "w-full min-h-10 rounded-[0.9rem] border border-white/8 bg-[#111827] px-3 py-2 text-sm text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/40 focus:border-[#00E5FF]/35";

const textareaClass =
  "w-full rounded-[0.9rem] border border-white/8 bg-[#111827] px-3 py-2 text-sm text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/40 focus:border-[#00E5FF]/35 resize-none";

const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-[#CBD5E1]/60";

const PLATFORMS = ["TikTok", "Instagram Reels", "YouTube Shorts", "X", "Facebook", "Stories"];

type CampaignPackage = {
  dailyBrief: string;
  primaryMessage: string;
  videoConcepts: Array<{
    platform: string;
    hook: string;
    body: string;
    cta: string;
    assetIdea: string;
  }>;
  captions: Array<{
    platform: string;
    caption: string;
    utmContent: string;
  }>;
  artistRepost: string;
  replies: string[];
  checklist: string[];
  tomorrowTest: string;
};

type FormState = {
  campaignName: string;
  focus: string;
  goal: string;
  audience: string;
  destination: string;
  rightsStatus: string;
  aiDisclosure: string;
  notes: string;
};

const INITIAL_FORM: FormState = {
  campaignName: "FlowSoundz Radio Launch",
  focus: "Prove the live station with one now-playing moment",
  goal: "Drive qualified listeners to the live radio page and turn attention into repeat listening.",
  audience: "Independent music fans, artists, producers, and early supporters.",
  destination: "/radio",
  rightsStatus: "Use approved FlowSoundz station visuals and cleared audio only.",
  aiDisclosure: "Mention artist-led AI-assisted production only when relevant.",
  notes: "Keep the tone discovery-first, music-aware, and allergic to fake hype.",
};

function platformSource(platform: string) {
  const normalized = platform.toLowerCase();
  if (normalized.includes("instagram") || normalized.includes("reels") || normalized.includes("stories")) return "instagram";
  if (normalized.includes("tiktok")) return "tiktok";
  if (normalized.includes("youtube") || normalized.includes("shorts")) return "youtube";
  if (normalized === "x" || normalized.includes("twitter")) return "x";
  if (normalized.includes("facebook")) return "facebook";
  return "direct";
}

function slugify(value: string, fallback: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || fallback
  );
}

function buildLink(destination: string, campaignName: string, platform: string, utmContent: string) {
  if (typeof window === "undefined") return destination;
  const url = new URL(destination || "/radio", window.location.origin);
  url.searchParams.set("utm_source", platformSource(platform));
  url.searchParams.set("utm_medium", "organic_social");
  url.searchParams.set("utm_campaign", slugify(campaignName, "launch"));
  url.searchParams.set("utm_content", slugify(utmContent, "post_01"));
  return url.toString();
}

export function AdminSocialCampaignAgent() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "TikTok",
    "Instagram Reels",
    "YouTube Shorts",
    "X",
  ]);
  const [campaign, setCampaign] = useState<CampaignPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const fullPackage = useMemo(() => {
    if (!campaign) return "";

    const captions = campaign.captions
      .map((item) => {
        const link = buildLink(form.destination, form.campaignName, item.platform, item.utmContent);
        return [
          `# ${item.platform}`,
          item.caption,
          "",
          link,
        ].join("\n");
      })
      .join("\n\n");

    return [
      `Campaign: ${form.campaignName}`,
      "",
      `Daily brief: ${campaign.dailyBrief}`,
      "",
      `Primary message: ${campaign.primaryMessage}`,
      "",
      "Video concepts:",
      ...campaign.videoConcepts.map((item, index) =>
        `${index + 1}. ${item.platform} - ${item.hook}\n${item.body}\nCTA: ${item.cta}\nAsset: ${item.assetIdea}`,
      ),
      "",
      "Captions:",
      captions,
      "",
      "Artist repost:",
      campaign.artistRepost,
      "",
      "Reply bank:",
      ...campaign.replies.map((reply) => `- ${reply}`),
      "",
      "Checklist:",
      ...campaign.checklist.map((item) => `- ${item}`),
      "",
      `Tomorrow's test: ${campaign.tomorrowTest}`,
    ].join("\n");
  }, [campaign, form.campaignName, form.destination]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function togglePlatform(platform: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((item) => item !== platform)
        : [...prev, platform],
    );
  }

  async function generatePackage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setCampaign(null);

    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          platforms: selectedPlatforms,
          mode: "social_campaign",
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        campaign?: CampaignPackage;
        error?: string;
      };

      if (!res.ok || !payload.campaign) {
        throw new Error(payload.error || "Unable to generate campaign package.");
      }

      setCampaign(payload.campaign);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate campaign package.");
    } finally {
      setLoading(false);
    }
  }

  async function copyText(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    window.setTimeout(() => setCopied(""), 1800);
  }

  return (
    <div className="space-y-5">
      <form onSubmit={(event) => void generatePackage(event)} className="rounded-[1.8rem] border border-cyan-300/15 bg-[#0B1020]/86 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
              Social growth
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">AI Social Campaign Agent</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Generate a daily platform-native post package with hooks, captions, UTM links, reply copy, and rights checks.
            </p>
          </div>
          <button
            type="submit"
            disabled={loading || !form.focus.trim()}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(0,229,255,0.22)] transition hover:shadow-[0_0_30px_rgba(124,77,255,0.24)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Generating..." : "Generate campaign package"}
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5">
            <span className={labelClass}>Campaign name</span>
            <input value={form.campaignName} onChange={(e) => updateField("campaignName", e.target.value)} className={inputClass} />
          </label>
          <label className="grid gap-1.5">
            <span className={labelClass}>Destination</span>
            <input value={form.destination} onChange={(e) => updateField("destination", e.target.value)} className={inputClass} placeholder="/radio" />
          </label>
        </div>

        <div className="mt-4 grid gap-4">
          <label className="grid gap-1.5">
            <span className={labelClass}>Focus</span>
            <input value={form.focus} onChange={(e) => updateField("focus", e.target.value)} className={inputClass} placeholder="Now-playing post, artist submission push, weekly recap..." />
          </label>
          <label className="grid gap-1.5">
            <span className={labelClass}>Goal</span>
            <textarea rows={2} value={form.goal} onChange={(e) => updateField("goal", e.target.value)} className={textareaClass} />
          </label>
          <label className="grid gap-1.5">
            <span className={labelClass}>Audience</span>
            <input value={form.audience} onChange={(e) => updateField("audience", e.target.value)} className={inputClass} />
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5">
            <span className={labelClass}>Rights status</span>
            <textarea rows={2} value={form.rightsStatus} onChange={(e) => updateField("rightsStatus", e.target.value)} className={textareaClass} />
          </label>
          <label className="grid gap-1.5">
            <span className={labelClass}>AI disclosure</span>
            <textarea rows={2} value={form.aiDisclosure} onChange={(e) => updateField("aiDisclosure", e.target.value)} className={textareaClass} />
          </label>
        </div>

        <label className="mt-4 grid gap-1.5">
          <span className={labelClass}>Notes</span>
          <textarea rows={2} value={form.notes} onChange={(e) => updateField("notes", e.target.value)} className={textareaClass} />
        </label>

        <div className="mt-4">
          <p className={labelClass}>Platforms</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PLATFORMS.map((platform) => (
              <button
                key={platform}
                type="button"
                onClick={() => togglePlatform(platform)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  selectedPlatforms.includes(platform)
                    ? "border-cyan-300/35 bg-cyan-300/12 text-cyan-100"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white"
                }`}
              >
                {platform}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-[1rem] border border-[#ff2d55]/25 bg-[#ff2d55]/10 px-4 py-3 text-sm text-[#fecdd3]">
            {error}
          </p>
        ) : null}
      </form>

      {campaign ? (
        <div className="space-y-4">
          <div className="rounded-[1.8rem] border border-white/8 bg-[#0B1020]/86 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
                  Daily package
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">{campaign.primaryMessage}</h3>
              </div>
              <button
                type="button"
                onClick={() => void copyText("all", fullPackage)}
                className="rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold text-white/75 transition hover:border-white/20 hover:text-white"
              >
                {copied === "all" ? "Copied" : "Copy full package"}
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">{campaign.dailyBrief}</p>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {campaign.videoConcepts.map((item, index) => (
              <div key={`${item.platform}-${index}`} className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200/60">{item.platform}</p>
                <h4 className="mt-2 text-base font-semibold text-white">{item.hook}</h4>
                <p className="mt-3 text-sm leading-6 text-slate-300">{item.body}</p>
                <p className="mt-3 text-xs text-slate-500">CTA: {item.cta}</p>
                <p className="mt-1 text-xs text-slate-500">Asset: {item.assetIdea}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[1.8rem] border border-white/8 bg-[#0B1020]/86 p-6">
            <h3 className="text-lg font-semibold text-white">Platform captions</h3>
            <div className="mt-4 grid gap-3">
              {campaign.captions.map((item, index) => {
                const link = buildLink(form.destination, form.campaignName, item.platform, item.utmContent);
                const block = `${item.caption}\n\n${link}`;
                return (
                  <div key={`${item.platform}-${index}`} className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{item.platform}</p>
                      <button
                        type="button"
                        onClick={() => void copyText(`caption-${index}`, block)}
                        className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:border-white/20 hover:text-white"
                      >
                        {copied === `caption-${index}` ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.caption}</p>
                    <p className="mt-3 break-all font-mono text-[11px] leading-5 text-cyan-100/70">{link}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <CopyPanel title="Artist repost" value={campaign.artistRepost} copied={copied} id="artist-repost" onCopy={copyText} />
            <CopyPanel title="Reply bank" value={campaign.replies.map((reply) => `- ${reply}`).join("\n")} copied={copied} id="replies" onCopy={copyText} />
            <CopyPanel title="Checklist" value={[...campaign.checklist.map((item) => `- ${item}`), "", `Tomorrow: ${campaign.tomorrowTest}`].join("\n")} copied={copied} id="checklist" onCopy={copyText} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CopyPanel({
  title,
  value,
  copied,
  id,
  onCopy,
}: {
  title: string;
  value: string;
  copied: string;
  id: string;
  onCopy: (id: string, value: string) => Promise<void>;
}) {
  return (
    <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <button
          type="button"
          onClick={() => void onCopy(id, value)}
          className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:border-white/20 hover:text-white"
        >
          {copied === id ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{value}</p>
    </div>
  );
}
