"use client";

import { useState } from "react";
import { CreatorHubShell } from "@/components/creator-hub/CreatorHubShell";
import { ToolCard } from "@/components/creator-hub/ToolCard";
import {
  generateLyricIdeas,
  type LyricIdeasInput,
  type LyricIdeasOutput,
} from "@/lib/creatorHub/generators";

async function fetchLyricIdeas(input: LyricIdeasInput): Promise<LyricIdeasOutput> {
  const res = await fetch("/api/artist/generate-lyrics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("API error");
  return (await res.json()) as LyricIdeasOutput;
}

const MUSIC_TOOLS = [
  {
    name: "Suno",
    bestFor: "Full AI-generated songs with vocals, lyrics, and production",
    href: "https://suno.com",
    tag: "AI",
    tagColor: "#7c4dff",
  },
  {
    name: "Udio",
    bestFor: "High-quality AI music generation with fine-grained style control",
    href: "https://udio.com",
    tag: "AI",
    tagColor: "#7c4dff",
  },
  {
    name: "BandLab",
    bestFor: "Free browser-based DAW for recording, mixing, and collaboration",
    href: "https://www.bandlab.com",
    tag: "Free",
    tagColor: "#00e5ff",
  },
  {
    name: "Splice",
    bestFor: "Royalty-free samples, loops, and plugins for producers",
    href: "https://splice.com",
    tag: "Samples",
    tagColor: "#ff2da6",
  },
  {
    name: "Logic Pro",
    bestFor: "Professional DAW for Mac with deep MIDI and mixing tools",
    href: "https://www.apple.com/logic-pro/",
    tag: "Mac",
    tagColor: "#00e5ff",
  },
  {
    name: "FL Studio",
    bestFor: "Beat-making and full production; strong in hip-hop and electronic",
    href: "https://www.image-line.com/fl-studio/",
    tag: "DAW",
    tagColor: "#7c4dff",
  },
  {
    name: "Pro Tools",
    bestFor: "Industry-standard DAW for recording studios and professionals",
    href: "https://www.avid.com/pro-tools",
    tag: "Pro",
    tagColor: "#ff2da6",
  },
];

const LANGUAGE_OPTIONS = ["English", "Spanish", "Bilingual"] as const;
const EXPLICIT_OPTIONS = ["Clean", "Explicit", "Radio-Friendly"] as const;
const GOAL_OPTIONS = [
  "Hook ideas",
  "Rewrite verse",
  "Make it catchier",
  "Translate",
  "Create promo captions",
] as const;

const INITIAL_FORM: LyricIdeasInput = {
  songIdea: "",
  genre: "",
  mood: "",
  language: "English",
  explicit: "Radio-Friendly",
  goal: "Hook ideas",
};

export default function CreatePage() {
  const [form, setForm] = useState<LyricIdeasInput>(INITIAL_FORM);
  const [output, setOutput] = useState<LyricIdeasOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function update<K extends keyof LyricIdeasInput>(
    key: K,
    value: LyricIdeasInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleGenerate() {
    if (!form.songIdea.trim() || !form.genre.trim() || !form.mood.trim()) return;
    setIsLoading(true);
    try {
      const result = await fetchLyricIdeas(form);
      setOutput(result);
    } catch {
      setOutput(generateLyricIdeas(form));
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        document.getElementById("lyric-output")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }

  return (
    <CreatorHubShell eyebrow="Creator Hub" title="Create Music">
      {/* ── Intro ── */}
      <div className="mb-10 glass-card rounded-[1.8rem] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
          Step 1
        </p>
        <h2 className="mt-3 text-xl font-semibold text-white sm:text-2xl">
          Create or Refine Your Music
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
          Use your preferred DAW, AI tool, or production workflow to create your song.
          FlowSoundz does not replace your creative process — it helps you prepare the release
          for discovery. Choose a tool below, or use what you already know.
        </p>
      </div>

      {/* ── Music Tools ── */}
      <div className="mb-12">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
          Production Tools
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {MUSIC_TOOLS.map((tool) => (
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

      {/* ── Lyric Assistant ── */}
      <div className="mb-10">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
          Lyric Assistant
        </p>
        <div className="glass-card rounded-[1.8rem] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white">
            Generate Lyric Ideas
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Describe your song concept and get hook ideas, title ideas, and promo captions.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 sm:col-span-2">
              <span className="text-sm font-medium text-white">Song idea or concept</span>
              <input
                type="text"
                value={form.songIdea}
                onChange={(e) => update("songIdea", e.target.value)}
                placeholder="What is the song about? A feeling, a moment, a story…"
                className="min-h-12 rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#00E5FF]/35"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">Genre</span>
              <input
                type="text"
                value={form.genre}
                onChange={(e) => update("genre", e.target.value)}
                placeholder="R&B, Afrobeats, Trap, Alt-pop…"
                className="min-h-12 rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#00E5FF]/35"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">Mood / Feeling</span>
              <input
                type="text"
                value={form.mood}
                onChange={(e) => update("mood", e.target.value)}
                placeholder="Late night, emotional, hype, nostalgic…"
                className="min-h-12 rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#00E5FF]/35"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">Language</span>
              <select
                value={form.language}
                onChange={(e) =>
                  update("language", e.target.value as LyricIdeasInput["language"])
                }
                className="min-h-12 rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-white outline-none transition focus:border-[#00E5FF]/35"
              >
                {LANGUAGE_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">Version</span>
              <select
                value={form.explicit}
                onChange={(e) =>
                  update("explicit", e.target.value as LyricIdeasInput["explicit"])
                }
                className="min-h-12 rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-white outline-none transition focus:border-[#00E5FF]/35"
              >
                {EXPLICIT_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 sm:col-span-2">
              <span className="text-sm font-medium text-white">What do you need?</span>
              <div className="flex flex-wrap gap-2">
                {GOAL_OPTIONS.map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => update("goal", goal)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      form.goal === goal
                        ? "border-[#00e5ff]/50 bg-[#00e5ff]/15 text-[#00e5ff]"
                        : "border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </label>
          </div>

          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={
              isLoading ||
              !form.songIdea.trim() ||
              !form.genre.trim() ||
              !form.mood.trim()
            }
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_22px_rgba(0,229,255,0.24)] transition hover:shadow-[0_0_28px_rgba(124,77,255,0.26)] disabled:opacity-40"
          >
            {isLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="15" />
                </svg>
                Generating…
              </>
            ) : (
              "✦ Generate Lyric Ideas"
            )}
          </button>

          <p className="mt-4 text-xs text-white/35">
            AI-generated lyrics should be reviewed and edited by you. Avoid copying another
            artist&apos;s lyrics, melody, or identity. This tool produces ideas, not finished works.
          </p>
        </div>
      </div>

      {/* ── Output ── */}
      {output ? (
        <div id="lyric-output" className="mb-10 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Hook Ideas", items: output.hookIdeas, accent: "#00e5ff" },
            { label: "Title Ideas", items: output.titleIdeas, accent: "#7c4dff" },
            { label: "Caption Ideas", items: output.captionIdeas, accent: "#ff2da6" },
          ].map((group) => (
            <div
              key={group.label}
              className="glass-card rounded-[1.6rem] p-5"
              style={{ borderColor: `${group.accent}25` }}
            >
              <p
                className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: group.accent }}
              >
                {group.label}
              </p>
              <ol className="space-y-3">
                {group.items.map((item, i) => (
                  <li key={i} className="text-sm leading-6 text-slate-300">
                    <span
                      className="mr-2 text-[10px] font-bold"
                      style={{ color: group.accent, opacity: 0.6 }}
                    >
                      {i + 1}.
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      ) : null}
    </CreatorHubShell>
  );
}
