"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { StationMode } from "@/lib/types";

type CreatorHubCatalogSummary = {
  stationMode: StationMode;
  isFallbackCatalog: boolean;
  artistCount: number;
  releaseCount: number;
  featuredArtistName: string | null;
  featuredTrackTitle: string | null;
};

type PersonaId = "independent" | "ai_assisted" | "virtual" | "producer";

type Persona = {
  id: PersonaId;
  title: string;
  accent: string;
  description: string;
  helper: string;
};

type StepId =
  | "create"
  | "lyrics"
  | "distribution"
  | "rights"
  | "visuals"
  | "submit";

type FlowStep = {
  id: StepId;
  title: string;
  description: string;
  href: string;
  accent: string;
  icon: string;
  cta: string;
  detail: string;
  personaNotes: Partial<Record<PersonaId, string>>;
};

const PERSONA_LABELS: Record<PersonaId, string> = {
  independent: "Independent Artist",
  ai_assisted: "AI-Assisted Artist",
  virtual: "Virtual Artist",
  producer: "Producer / Sound Designer",
};

const VISUAL_EXPORT_TARGETS = [
  { id: "tiktok", label: "Create TikTok Visual" },
  { id: "reels", label: "Create Reels Visual" },
  { id: "shorts", label: "Create Shorts Visual" },
] as const;

const STORAGE_KEY = "flowsoundz-creator-hub-flow-v1";

const PERSONAS: Persona[] = [
  {
    id: "independent",
    title: "Independent Artist",
    accent: "#00e5ff",
    description:
      "Self-releasing artists building audience without label support.",
    helper:
      "We’ll emphasize release readiness, promo assets, and a clean submission lane.",
  },
  {
    id: "ai_assisted",
    title: "AI-Assisted Artist",
    accent: "#7c4dff",
    description:
      "Creators using Suno, Udio, stem tools, or AI-assisted production workflows.",
    helper:
      "We’ll highlight provenance, rights clarity, and the strongest next step for AI-enabled releases.",
  },
  {
    id: "virtual",
    title: "Virtual Artist",
    accent: "#ff2da6",
    description:
      "Anonymous brands, alter egos, and character-driven music identities.",
    helper:
      "We’ll focus the flow on branding, visuals, and how the release appears in public-facing discovery.",
  },
  {
    id: "producer",
    title: "Producer / Sound Designer",
    accent: "#22d3ee",
    description:
      "Beat-makers and sonic architects preparing instrumentals, demos, or artist collaborations.",
    helper:
      "We’ll focus on technical prep, stems, and the cleanest route into promo-ready packaging.",
  },
];

const FLOW_STEPS: FlowStep[] = [
  {
    id: "create",
    title: "Create or upload your song",
    description:
      "Lock the version you want reviewed and move it into the release lane.",
    href: "/artist/create",
    accent: "#00e5ff",
    icon: "🎵",
    cta: "Create release",
    detail:
      "Start with your approved demo, bounce, or radio-ready draft. This should be the version you want FlowSoundz to hear first.",
    personaNotes: {
      producer:
        "If you are pitching production work, prepare the cleanest arrangement or strongest beat version first.",
      ai_assisted:
        "If you used AI generation, keep the clean source version plus any stems you may need to explain provenance later.",
    },
  },
  {
    id: "lyrics",
    title: "Prepare lyrics and artist bio",
    description:
      "Build the short-form context that helps radio, promo, and discovery land correctly.",
    href: "/artist/create",
    accent: "#7c4dff",
    icon: "✍️",
    cta: "Prepare copy",
    detail:
      "Write a concise artist bio, clean lyrics, and a one-line explanation of what makes the release worth programming.",
    personaNotes: {
      virtual:
        "For virtual projects, keep the lore tight. A short identity statement is stronger than a long backstory.",
      independent:
        "Treat this like your A&R one-sheet. Clear, specific, and easy to reuse across promo.",
    },
  },
  {
    id: "distribution",
    title: "Check distribution options",
    description:
      "Decide whether the track is radio-first, streaming-first, or timed for a coordinated rollout.",
    href: "/artist/distribution",
    accent: "#00e5ff",
    icon: "🌐",
    cta: "Review distribution",
    detail:
      "Know where the record will live before and after radio review. That keeps the public release timing clean.",
    personaNotes: {
      independent:
        "If you have not distributed yet, this is where you decide whether FlowSoundz should be an early discovery moment.",
    },
  },
  {
    id: "rights",
    title: "Review rights and licensing basics",
    description:
      "Make sure the submission can survive review, hosting, and downstream distributor checks.",
    href: "/artist/rights",
    accent: "#ff2da6",
    icon: "📋",
    cta: "Check rights",
    detail:
      "Confirm ownership, clear collaborators, and document what is original before you pitch for curation.",
    personaNotes: {
      ai_assisted:
        "AI-assisted release selected: use this step as your provenance check. Tag what is human-performed, what is AI-generated, and what you have materially transformed.",
      producer:
        "If samples, packs, or collaborative stems are involved, verify permissions before you submit.",
    },
  },
  {
    id: "visuals",
    title: "Create visuals or promo video",
    description:
      "Turn the release into a short-form promo asset without leaving the ecosystem.",
    href: "/artist/video",
    accent: "#7c4dff",
    icon: "🎬",
    cta: "Open visualizer studio",
    detail:
      "This is the fastest place to build a promo loop for TikTok, Reels, Shorts, and station-side sharing.",
    personaNotes: {
      virtual:
        "Virtual artists should treat Step 5 as core identity work, not an extra. This is your front-facing brand moment.",
      ai_assisted:
        "This is the best current power feature in the Hub: generate a polished visual without waiting for external editors.",
    },
  },
  {
    id: "submit",
    title: "Submit for FlowSoundz Radio review",
    description:
      "Send the release into curation once the music, metadata, and visuals are ready.",
    href: "/artist/submit",
    accent: "#00e5ff",
    icon: "📡",
    cta: "Submit track",
    detail:
      "Once this step is complete, the release enters the review lane for possible rotation, promo, or featured placement.",
    personaNotes: {
      independent:
        "This is where discovery starts. Keep the package clean so the music can be judged on merit.",
      producer:
        "If the release is a pitch tool rather than a final drop, say that clearly in your submission notes.",
    },
  },
];

type PersistedFlowState = {
  personaId: PersonaId | null;
  completedStepIds: StepId[];
};

function readPersistedState(): PersistedFlowState {
  if (typeof window === "undefined") {
    return { personaId: null, completedStepIds: [] };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { personaId: null, completedStepIds: [] };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedFlowState>;
    return {
      personaId:
        parsed.personaId && PERSONAS.some((persona) => persona.id === parsed.personaId)
          ? parsed.personaId
          : null,
      completedStepIds: Array.isArray(parsed.completedStepIds)
        ? parsed.completedStepIds.filter((id): id is StepId =>
            FLOW_STEPS.some((step) => step.id === id),
          )
        : [],
    };
  } catch {
    return { personaId: null, completedStepIds: [] };
  }
}

export function CreatorHubDashboardFlow({
  catalogSummary,
}: {
  catalogSummary: CreatorHubCatalogSummary;
}) {
  const initialState = useMemo(() => readPersistedState(), []);
  const [personaId, setPersonaId] = useState<PersonaId | null>(initialState.personaId);
  const [completedStepIds, setCompletedStepIds] = useState<StepId[]>(
    initialState.completedStepIds,
  );
  const [activeStepId, setActiveStepId] = useState<StepId>(
    FLOW_STEPS.find((step) => !initialState.completedStepIds.includes(step.id))?.id ??
      FLOW_STEPS[FLOW_STEPS.length - 1].id,
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const payload: PersistedFlowState = { personaId, completedStepIds };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [personaId, completedStepIds]);

  const persona = PERSONAS.find((item) => item.id === personaId) ?? null;
  const progressPercent = Math.round((completedStepIds.length / FLOW_STEPS.length) * 100);
  const stationModeLabel =
    catalogSummary.stationMode === "live"
      ? "Live rotation"
      : catalogSummary.stationMode === "playable_archive"
        ? "Playable archive"
        : "Maintenance";

  const personalizedSteps = useMemo(
    () =>
      FLOW_STEPS.map((step) => ({
        ...step,
        personaNote: persona ? step.personaNotes[persona.id] ?? null : null,
      })),
    [persona],
  );

  function handleSelectPersona(nextPersonaId: PersonaId) {
    setPersonaId(nextPersonaId);
  }

  function toggleStepCompletion(stepId: StepId) {
    setCompletedStepIds((current) => {
      const exists = current.includes(stepId);
      const next = exists ? current.filter((id) => id !== stepId) : [...current, stepId];

      if (!exists) {
        const nextIncomplete =
          FLOW_STEPS.find((step) => step.id !== stepId && !next.includes(step.id))?.id ?? stepId;
        setActiveStepId(nextIncomplete);
      } else {
        setActiveStepId(stepId);
      }

      return next;
    });
  }

  function getStepHref(step: FlowStep) {
    return step.href;
  }

  return (
    <div className="space-y-10">
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-card rounded-[1.9rem] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
            Guided release flow
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-semibold text-white">
                One step open. One next move.
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                The Creator Hub now behaves like a lightweight A&amp;R workflow. Finish each step,
                mark it complete, and the next one opens automatically.
              </p>
            </div>
            <div className="rounded-[1.3rem] border border-white/8 bg-white/[0.04] px-4 py-3 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/75">
                Progress
              </p>
              <p className="mt-1 text-2xl font-semibold text-white">{progressPercent}%</p>
            </div>
          </div>

          <div className="mt-5">
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#00e5ff_0%,#7c4dff_65%,#ff2da6_100%)] shadow-[0_0_18px_rgba(0,229,255,0.28)] transition-all duration-500"
                style={{ width: `${Math.max(progressPercent, 6)}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {FLOW_STEPS.map((step, index) => {
                const done = completedStepIds.includes(step.id);
                const active = activeStepId === step.id;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveStepId(step.id)}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                      active
                        ? "border-cyan-300/24 bg-cyan-300/12 text-white"
                        : done
                          ? "border-white/10 bg-white/[0.04] text-cyan-200/75"
                          : "border-white/8 bg-white/[0.02] text-slate-400 hover:text-white"
                    }`}
                  >
                    {done ? "✓" : index + 1} {step.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="glass-card rounded-[1.9rem] border border-fuchsia-400/14 bg-[linear-gradient(180deg,rgba(255,45,166,0.08),rgba(7,17,31,0.96))] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-fuchsia-200/75">
            Choose your creator lane
          </p>
          <h3 className="mt-3 text-xl font-semibold text-white">
            Personalize the Hub before you submit.
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Pick the creator persona that best matches this release. The Hub will tune its guidance,
            rights notes, and promo hints around that workflow.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {PERSONAS.map((item) => {
              const active = item.id === personaId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectPersona(item.id)}
                  className={`rounded-[1.3rem] border p-4 text-left transition ${
                    active
                      ? "bg-white/[0.06] shadow-[0_0_24px_rgba(0,229,255,0.08)]"
                      : "bg-white/[0.03] hover:bg-white/[0.05]"
                  }`}
                  style={{ borderColor: active ? `${item.accent}55` : "rgba(255,255,255,0.08)" }}
                >
                  <p className="text-sm font-semibold" style={{ color: item.accent }}>
                    {item.title}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-300">{item.description}</p>
                </button>
              );
            })}
          </div>
          <div className="mt-5 rounded-[1.3rem] border border-white/8 bg-black/20 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/75">
              Current guidance
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              {persona?.helper ??
                "Select a creator lane to customize the checklist and surface the most relevant next actions."}
            </p>
            <div className="mt-4 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
              <div className="rounded-[1rem] border border-white/8 bg-white/[0.03] px-3 py-3">
                <p className="font-semibold uppercase tracking-[0.18em] text-cyan-200/75">
                  Station mode
                </p>
                <p className="mt-1 text-sm text-white">{stationModeLabel}</p>
              </div>
              <div className="rounded-[1rem] border border-white/8 bg-white/[0.03] px-3 py-3">
                <p className="font-semibold uppercase tracking-[0.18em] text-cyan-200/75">
                  Featured right now
                </p>
                <p className="mt-1 text-sm text-white">
                  {catalogSummary.featuredArtistName ?? "FlowSoundz roster"}
                </p>
                <p className="mt-1 text-[11px] text-slate-300">
                  {catalogSummary.featuredTrackTitle ?? "Curated discovery moment"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
          Release readiness
        </p>
        <div className="space-y-4">
          {personalizedSteps.map((step, index) => {
            const active = activeStepId === step.id;
            const done = completedStepIds.includes(step.id);

            return (
              <article
                key={step.id}
                className="overflow-hidden rounded-[1.7rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015))] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
              >
                <button
                  type="button"
                  onClick={() => setActiveStepId(step.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] text-lg"
                      style={{ background: `${step.accent}16`, color: step.accent }}
                    >
                      {done ? "✓" : step.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Step {index + 1} of {FLOW_STEPS.length}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-white">{step.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-300">{step.description}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {done ? (
                      <span className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                        Complete
                      </span>
                    ) : active ? (
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                        Active
                      </span>
                    ) : null}
                    <span className="text-white/35">{active ? "−" : "+"}</span>
                  </div>
                </button>

                {active ? (
                  <div className="border-t border-white/8 px-5 pb-5 pt-4">
                    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                      <div className="space-y-4">
                        <p className="text-sm leading-7 text-slate-200">{step.detail}</p>
                        {step.personaNote ? (
                          <div className="rounded-[1.2rem] border border-fuchsia-400/14 bg-fuchsia-500/[0.05] px-4 py-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200/75">
                              Persona note
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-200">{step.personaNote}</p>
                          </div>
                        ) : null}
                        <div className="flex flex-wrap gap-3">
                          {(
                            <Link
                              href={getStepHref(step)}
                              className="inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_18px_rgba(0,229,255,0.18)] transition hover:shadow-[0_0_28px_rgba(0,229,255,0.28)]"
                              style={{
                                background: `linear-gradient(135deg, ${step.accent} 0%, rgba(124,77,255,0.92) 100%)`,
                              }}
                            >
                              {step.cta}
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleStepCompletion(step.id)}
                            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/12 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.05]"
                          >
                            {done ? "Mark incomplete" : "Mark complete"}
                          </button>
                        </div>
                      </div>

                      <div className="rounded-[1.3rem] border border-white/8 bg-black/20 px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/75">
                          Suggested today
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-200">
                          {step.id === "visuals"
                            ? "Generate an AI video prompt and social captions for TikTok, Reels, and Shorts. Takes 60 seconds and gives you ready-to-paste copy for every platform."
                            : step.id === "rights" && personaId === "ai_assisted"
                              ? "Run your AI-assisted release through a quick provenance review before submission so the record is easier to clear later."
                              : step.id === "create"
                                ? "Treat this like the master working lane. Pick the version you want radio programmers to hear first."
                                : "Complete this step cleanly before moving forward. The Hub will open the next stage automatically."}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-card rounded-[1.8rem] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
                Streaming growth snapshot
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">
                {catalogSummary.releaseCount > 0
                  ? `${catalogSummary.releaseCount} release${catalogSummary.releaseCount === 1 ? "" : "s"} currently feeding the station model`
                  : "Analytics will start here after your first release"}
              </h3>
            </div>
            <span className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
              Beta preview
            </span>
          </div>
          <div className="mt-6 rounded-[1.5rem] border border-white/8 bg-[linear-gradient(180deg,#09101f_0%,#050816_100%)] p-4">
            <svg viewBox="0 0 520 220" className="h-[220px] w-full" aria-hidden>
              <defs>
                <linearGradient id="hubChartStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00e5ff" />
                  <stop offset="60%" stopColor="#7c4dff" />
                  <stop offset="100%" stopColor="#ff2da6" />
                </linearGradient>
              </defs>
              {[40, 85, 130, 175].map((y) => (
                <line
                  key={y}
                  x1="36"
                  x2="490"
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray="3 8"
                />
              ))}
              {[80, 150, 220, 290, 360, 430].map((x) => (
                <line
                  key={x}
                  x1={x}
                  x2={x}
                  y1="20"
                  y2="190"
                  stroke="rgba(255,255,255,0.04)"
                />
              ))}
              <path
                d="M 40 170 C 90 168, 130 164, 180 156 S 290 140, 350 124 S 420 100, 480 82"
                fill="none"
                stroke="url(#hubChartStroke)"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.35"
              />
              <path
                d="M 40 170 C 90 168, 130 164, 180 156 S 290 140, 350 124 S 420 100, 480 82 L 480 190 L 40 190 Z"
                fill="url(#hubChartStroke)"
                opacity="0.08"
              />
              <circle cx="350" cy="124" r="6" fill="#00e5ff" opacity="0.65" />
              <circle cx="480" cy="82" r="7" fill="#ff2da6" opacity="0.7" />
            </svg>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {catalogSummary.isFallbackCatalog
                ? "The Hub is currently reading from the curated archive snapshot. Once your release enters rotation, creator-side analytics will begin filling this space."
                : "Your streaming data will appear here after your first release enters rotation or receives creator-side reporting."}
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="glass-card rounded-[1.8rem] border border-fuchsia-400/14 bg-fuchsia-500/[0.04] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fuchsia-200/75">
              Visualizer pipeline
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white">
              Step 5 is your current competitive edge
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Open the Visualizer Studio directly from the flow and turn album art plus audio into a promo-ready loop without leaving the Hub. The current catalog snapshot includes {catalogSummary.artistCount} artist{catalogSummary.artistCount === 1 ? "" : "s"} and {catalogSummary.releaseCount} tracked release{catalogSummary.releaseCount === 1 ? "" : "s"}.
            </p>
            <Link
              href="/visualizer"
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-fuchsia-400/24 bg-fuchsia-400/10 px-5 py-2.5 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-400/[0.18]"
            >
              Launch visualizer studio
            </Link>
          </div>

          <div className="glass-card rounded-[1.8rem] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300/75">
              Now live in the Hub
            </p>
            <div className="mt-3 space-y-2.5">
              {[
                { href: "/artist/profile", label: "Profile editor", desc: "Bio, social links, tip destinations" },
                { href: "/artist/kit", label: "AI Release Kit", desc: "Full promo + hooks + video prompt" },
                { href: "/artist/releases", label: "Release scheduler", desc: "Members early + public dates per track" },
                { href: "/artist/analytics", label: "Track analytics", desc: "Plays, skips, requests, milestones" },
              ].map(({ href, label, desc }) => (
                <Link key={href} href={href} className="flex items-start gap-2 rounded-[1rem] border border-white/6 bg-white/[0.02] px-3 py-2.5 transition hover:border-white/12 hover:bg-white/[0.04]">
                  <span className="mt-0.5 text-[10px] text-emerald-400">✓</span>
                  <div>
                    <p className="text-xs font-semibold text-white">{label}</p>
                    <p className="text-[11px] text-slate-400">{desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
