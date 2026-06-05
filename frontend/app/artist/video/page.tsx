"use client";

import { useState } from "react";
import { CreatorHubShell } from "@/components/creator-hub/CreatorHubShell";
import { ToolCard } from "@/components/creator-hub/ToolCard";
import {
  generateVideoPrompt,
  type VideoPromptInput,
  type VideoPromptOutput,
} from "@/lib/creatorHub/generators";
import Link from "next/link";

async function fetchVideoPrompt(input: VideoPromptInput): Promise<VideoPromptOutput> {
  const res = await fetch("/api/artist/generate-video-prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("API error");
  return (await res.json()) as VideoPromptOutput;
}

const VIDEO_TOOLS = [
  {
    name: "Runway",
    bestFor: "High-quality AI video generation with motion control and Gen-3",
    href: "https://runwayml.com",
    tag: "AI Video",
    tagColor: "#7c4dff",
  },
  {
    name: "LTX Studio",
    bestFor: "AI cinematic music video creation with scene and character control",
    href: "https://ltx.studio",
    tag: "AI",
    tagColor: "#00e5ff",
  },
  {
    name: "Kaiber",
    bestFor: "Music-reactive AI visuals, audioreactivity, and animation",
    href: "https://kaiber.ai",
    tag: "Music-Sync",
    tagColor: "#ff2da6",
  },
  {
    name: "Canva",
    bestFor: "Quick cover art, lyric cards, and promo graphics with templates",
    href: "https://www.canva.com",
    tag: "Free Tier",
    tagColor: "#00e5ff",
  },
  {
    name: "CapCut",
    bestFor: "Reels, TikToks, and short-form video editing on mobile and desktop",
    href: "https://www.capcut.com",
    tag: "Free",
    tagColor: "#7c4dff",
  },
  {
    name: "Pika",
    bestFor: "Text-to-video and image-to-video for short cinematic clips",
    href: "https://pika.art",
    tag: "AI",
    tagColor: "#7c4dff",
  },
  {
    name: "Kling",
    bestFor: "Realistic AI video generation with strong motion and detail",
    href: "https://klingai.com",
    tag: "AI",
    tagColor: "#ff2da6",
  },
  {
    name: "Luma Dream Machine",
    bestFor: "Smooth, photorealistic AI video clips from text or image prompts",
    href: "https://lumalabs.ai",
    tag: "AI",
    tagColor: "#00e5ff",
  },
];

const VISUAL_STYLES = [
  "Neon",
  "Cinematic",
  "Street",
  "Anime",
  "Futuristic",
  "Dark Luxury",
  "Beach",
  "Club",
  "Emotional",
] as const;

const VIDEO_TYPES = [
  "Music video",
  "Visualizer",
  "Lyric video",
  "Promo reel",
  "Cover art animation",
] as const;

const INITIAL_FORM: VideoPromptInput = {
  artistName: "",
  songTitle: "",
  genre: "",
  vibe: "",
  visualStyle: "Neon",
  videoType: "Music video",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        });
      }}
      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-white/60 transition hover:border-white/20 hover:text-white"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function VideoPage() {
  const [form, setForm] = useState<VideoPromptInput>(INITIAL_FORM);
  const [output, setOutput] = useState<VideoPromptOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function update<K extends keyof VideoPromptInput>(
    key: K,
    value: VideoPromptInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleGenerate() {
    if (!form.artistName.trim() || !form.songTitle.trim()) return;
    setIsLoading(true);
    try {
      const result = await fetchVideoPrompt(form);
      setOutput(result);
    } catch {
      setOutput(generateVideoPrompt(form));
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        document.getElementById("video-output")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }

  return (
    <CreatorHubShell eyebrow="Creator Hub" title="Visuals & Promo Video">
      {/* ── Intro ── */}
      <div className="mb-10 glass-card rounded-[1.8rem] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
          Step 4 of 5
        </p>
        <h2 className="mt-3 text-xl font-semibold text-white sm:text-2xl">
          Turn Your Song Into Content
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
          Your track needs visuals — for Instagram, TikTok, YouTube Shorts, and your FlowSoundz
          artist spotlight. Use the tools below to generate a music video, cover animation, or
          lyric visual. Then copy the AI prompt straight into your video tool of choice.
        </p>
        <p className="mt-3 text-sm font-medium text-cyan-100/80">
          Goal: at least one piece of visual content ready before you submit.
        </p>
      </div>

      {/* ── Video Tools ── */}
      <div className="mb-12">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
          Visual Creation Tools
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {VIDEO_TOOLS.map((tool) => (
            <ToolCard
              key={tool.name}
              name={tool.name}
              bestFor={tool.bestFor}
              href={tool.href}
              tag={tool.tag}
              tagColor={tool.tagColor}
            />
          ))}
        </div>
      </div>

      {/* ── Prompt Generator ── */}
      <div className="mb-10">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
          Video Prompt Generator
        </p>
        <div className="glass-card rounded-[1.8rem] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white">
            Generate a Video Prompt
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Paste the generated prompt directly into Runway, Pika, Kling, or any AI video tool.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">Artist name</span>
              <input
                type="text"
                value={form.artistName}
                onChange={(e) => update("artistName", e.target.value)}
                placeholder="Your artist name"
                className="min-h-12 rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#00E5FF]/35"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">Song title</span>
              <input
                type="text"
                value={form.songTitle}
                onChange={(e) => update("songTitle", e.target.value)}
                placeholder="Track name"
                className="min-h-12 rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#00E5FF]/35"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">Genre</span>
              <input
                type="text"
                value={form.genre}
                onChange={(e) => update("genre", e.target.value)}
                placeholder="R&B, Afrobeats, Electronic…"
                className="min-h-12 rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#00E5FF]/35"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">Vibe</span>
              <input
                type="text"
                value={form.vibe}
                onChange={(e) => update("vibe", e.target.value)}
                placeholder="Chill, Hype, Late Night, Emotional…"
                className="min-h-12 rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#00E5FF]/35"
              />
            </label>

            <label className="grid gap-2 sm:col-span-2">
              <span className="text-sm font-medium text-white">Visual style</span>
              <div className="flex flex-wrap gap-2">
                {VISUAL_STYLES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => update("visualStyle", s)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      form.visualStyle === s
                        ? "border-[#7c4dff]/50 bg-[#7c4dff]/15 text-[#7c4dff]"
                        : "border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </label>

            <label className="grid gap-2 sm:col-span-2">
              <span className="text-sm font-medium text-white">Video type</span>
              <div className="flex flex-wrap gap-2">
                {VIDEO_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => update("videoType", t)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      form.videoType === t
                        ? "border-[#00e5ff]/50 bg-[#00e5ff]/15 text-[#00e5ff]"
                        : "border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </label>
          </div>

          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={isLoading || !form.artistName.trim() || !form.songTitle.trim()}
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#7c4dff_0%,#00e5ff_100%)] px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_22px_rgba(124,77,255,0.24)] transition disabled:opacity-40"
          >
            {isLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="15" />
                </svg>
                Generating…
              </>
            ) : (
              "✦ Generate Video Prompt"
            )}
          </button>
        </div>
      </div>

      {/* ── Output ── */}
      {output ? (
        <div id="video-output" className="mb-10 grid gap-4">
          {/* Main Prompt */}
          <div className="glass-card rounded-[1.8rem] p-5 sm:p-6" style={{ borderColor: "#7c4dff30" }}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7c4dff]">
                Video Prompt
              </p>
              <CopyButton text={output.prompt} />
            </div>
            <p className="text-sm leading-7 text-slate-200">{output.prompt}</p>
            <p className="mt-3 text-xs text-slate-500">
              Copy this prompt into Runway, Pika, Kling, or LTX Studio.
            </p>
          </div>

          {/* Captions */}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "TikTok Caption", text: output.tiktokCaption, accent: "#ff2da6" },
              { label: "IG Reel Caption", text: output.igCaption, accent: "#7c4dff" },
              { label: "YouTube Caption", text: output.youtubeCaption, accent: "#00e5ff" },
            ].map((item) => (
              <div
                key={item.label}
                className="glass-card rounded-[1.6rem] p-5"
                style={{ borderColor: `${item.accent}25` }}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p
                    className="text-[11px] font-semibold uppercase tracking-[0.22em]"
                    style={{ color: item.accent }}
                  >
                    {item.label}
                  </p>
                  <CopyButton text={item.text} />
                </div>
                <p className="text-sm leading-6 text-slate-300">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Next ── */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/artist/submit"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_22px_rgba(0,229,255,0.24)] transition"
        >
          Continue: Submit Track →
        </Link>
      </div>
    </CreatorHubShell>
  );
}
