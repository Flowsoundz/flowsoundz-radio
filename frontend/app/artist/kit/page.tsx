"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "fsz-release-kit";
import { CreatorHubShell } from "@/components/creator-hub/CreatorHubShell";

type KitOutput = {
  promo: { bio: string; promoBlurb: string; radioIntro: string; socialCaptions: string[]; suggestedVibe: string } | null;
  lyrics: { hookIdeas: string[]; titleIdeas: string[]; captionIdeas: string[] } | null;
  video: { visualPrompt: string; motionNotes: string; colorNotes: string; overlayText: string; platforms: Record<string, string> } | null;
};

const VIBES = ["Chill", "Hype", "Late Night", "Emotional"] as const;
const ARTIST_TYPES = ["Independent", "AI-Assisted", "Virtual Artist", "Producer"] as const;

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { void navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
      className="shrink-0 rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400 transition hover:border-white/20 hover:text-white"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function OutputBlock({ label, content }: { label: string; content: string }) {
  return (
    <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
        <CopyBtn text={content} />
      </div>
      <p className="text-sm leading-6 text-slate-200 whitespace-pre-wrap">{content}</p>
    </div>
  );
}

function ListOutputBlock({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
        <CopyBtn text={items.join("\n")} />
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7c4dff]" />
            <span className="text-sm leading-6 text-slate-200">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const TABS = ["Promo", "Radio", "Social", "Hooks", "Video"] as const;
type Tab = (typeof TABS)[number];

export default function ReleaseKitPage() {
  const [artistName, setArtistName] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [vibe, setVibe] = useState<string>("Chill");
  const [artistType, setArtistType] = useState<string>("Independent");
  const [description, setDescription] = useState("");
  const [coreThemes, setCoreThemes] = useState("");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<KitOutput | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Promo");
  const [error, setError] = useState("");
  const [savingBio, setSavingBio] = useState(false);
  const [bioSaved, setBioSaved] = useState<"ok" | "err" | null>(null);

  // Restore the last kit so generated copy survives navigation/refresh.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as { inputs?: Record<string, string>; output?: KitOutput };
      if (s.inputs) {
        setArtistName(s.inputs.artistName ?? "");
        setSongTitle(s.inputs.songTitle ?? "");
        setGenre(s.inputs.genre ?? "");
        setVibe(s.inputs.vibe ?? "Chill");
        setArtistType(s.inputs.artistType ?? "Independent");
        setDescription(s.inputs.description ?? "");
        setCoreThemes(s.inputs.coreThemes ?? "");
      }
      if (s.output) setOutput(s.output);
    } catch {
      /* ignore corrupt cache */
    }
  }, []);

  async function saveBioToProfile(bio: string) {
    setSavingBio(true);
    setBioSaved(null);
    try {
      const r = await fetch("/api/artist/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio }),
      });
      setBioSaved(r.ok ? "ok" : "err");
    } catch {
      setBioSaved("err");
    } finally {
      setSavingBio(false);
      setTimeout(() => setBioSaved(null), 3500);
    }
  }

  function clearKit() {
    setOutput(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOutput(null);

    const base = { artistName, songTitle, genre, vibe, artistType, description, coreThemes };

    try {
      const [promoRes, lyricsRes, videoRes] = await Promise.all([
        fetch("/api/artist/generate-promo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(base) }),
        fetch("/api/artist/generate-lyrics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...base, songIdea: description || songTitle, mood: vibe, language: "English", explicit: "Clean", goal: "Hook ideas" }) }),
        fetch("/api/artist/generate-video-prompt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...base, visualStyle: "Cinematic", videoType: "Loop" }) }),
      ]);

      const [promo, lyrics, video] = await Promise.all([
        promoRes.ok ? promoRes.json() : null,
        lyricsRes.ok ? lyricsRes.json() : null,
        videoRes.ok ? videoRes.json() : null,
      ]) as [KitOutput["promo"], KitOutput["lyrics"], KitOutput["video"]];

      setOutput({ promo, lyrics, video });
      setActiveTab("Promo");
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ inputs: base, output: { promo, lyrics, video } }));
      } catch {
        /* storage full / unavailable — non-fatal */
      }
    } catch {
      setError("Generation failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <CreatorHubShell eyebrow="Creator Hub" title="AI Release Kit">
      <p className="mb-8 text-sm text-slate-400 max-w-xl">
        Fill in your track details and generate your full release package — promo copy, radio intro, social captions, hook ideas, and a video prompt — in one shot.
      </p>

      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        {/* Input form */}
        <form onSubmit={(e) => { void generate(e); }} className="space-y-5">
          <div className="rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 p-6 space-y-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Track Info</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Artist Name">
                <input value={artistName} onChange={(e) => setArtistName(e.target.value)} required placeholder="Your artist name" className={INPUT} />
              </Field>
              <Field label="Song Title">
                <input value={songTitle} onChange={(e) => setSongTitle(e.target.value)} required placeholder="Track title" className={INPUT} />
              </Field>
              <Field label="Genre">
                <input value={genre} onChange={(e) => setGenre(e.target.value)} required placeholder="e.g. Latin Trap" className={INPUT} />
              </Field>
              <Field label="Vibe">
                <select value={vibe} onChange={(e) => setVibe(e.target.value)} className={INPUT}>
                  {VIBES.map((v) => <option key={v}>{v}</option>)}
                </select>
              </Field>
              <Field label="Artist Type">
                <select value={artistType} onChange={(e) => setArtistType(e.target.value)} className={INPUT}>
                  {ARTIST_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Core Themes">
                <input value={coreThemes} onChange={(e) => setCoreThemes(e.target.value)} placeholder="Resilience, identity, city life…" className={INPUT} />
              </Field>
            </div>
            <Field label="Track Description" hint="What makes this song worth programming?">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe the vibe, story, or energy of the track…" className={INPUT} />
            </Field>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_50%,#ff2da6_100%)] text-sm font-bold text-white shadow-[0_0_24px_rgba(0,229,255,0.3)] transition hover:shadow-[0_0_36px_rgba(0,229,255,0.5)] disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Generating kit…
              </span>
            ) : "Generate Full Release Kit"}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>

        {/* Output */}
        <div>
          {!output && !loading && (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-[1.8rem] border border-dashed border-white/10 text-sm text-slate-500">
              Your release kit will appear here
            </div>
          )}
          {loading && (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#7c4dff] border-t-transparent" />
                <p className="text-sm text-slate-400">Running all generators in parallel…</p>
              </div>
            </div>
          )}
          {output && (
            <div className="rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-white/[0.06] overflow-x-auto scrollbar-none">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`shrink-0 px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                      activeTab === tab
                        ? "border-b-2 border-[#7c4dff] text-white"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearKit}
                  className="ml-auto shrink-0 px-4 py-3 text-xs font-medium text-slate-500 transition hover:text-white"
                >
                  Start over
                </button>
              </div>

              <div className="p-5 space-y-4">
                {activeTab === "Promo" && output.promo && (
                  <>
                    <OutputBlock label="Artist Bio" content={output.promo.bio} />
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => void saveBioToProfile(output.promo!.bio)}
                        disabled={savingBio}
                        className="rounded-full border border-cyan-300/25 bg-cyan-300/[0.06] px-4 py-1.5 text-xs font-semibold text-cyan-200 transition hover:border-cyan-300/40 disabled:opacity-50"
                      >
                        {savingBio ? "Saving…" : "Save as my profile bio"}
                      </button>
                      {bioSaved === "ok" && <span className="text-xs text-emerald-400">Saved to profile ✓</span>}
                      {bioSaved === "err" && (
                        <span className="text-xs text-red-400">Couldn&apos;t save — set it on your Profile.</span>
                      )}
                    </div>
                    <OutputBlock label="Promo Blurb" content={output.promo.promoBlurb} />
                  </>
                )}
                {activeTab === "Radio" && output.promo && (
                  <OutputBlock label="Radio Intro" content={output.promo.radioIntro} />
                )}
                {activeTab === "Social" && output.promo && (
                  <ListOutputBlock label="Social Captions" items={output.promo.socialCaptions} />
                )}
                {activeTab === "Hooks" && output.lyrics && (
                  <>
                    <ListOutputBlock label="Hook Ideas" items={output.lyrics.hookIdeas} />
                    <ListOutputBlock label="Title Ideas" items={output.lyrics.titleIdeas} />
                    <ListOutputBlock label="Caption Ideas" items={output.lyrics.captionIdeas} />
                  </>
                )}
                {activeTab === "Video" && output.video && (
                  <>
                    <OutputBlock label="Visual Prompt" content={output.video.visualPrompt} />
                    <OutputBlock label="Motion Notes" content={output.video.motionNotes} />
                    <OutputBlock label="Color Notes" content={output.video.colorNotes} />
                    <OutputBlock label="Overlay Text" content={output.video.overlayText} />
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </CreatorHubShell>
  );
}

const INPUT = "w-full rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-[#7c4dff]/40 focus:outline-none transition";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-slate-300">{label}</label>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
      {children}
    </div>
  );
}
