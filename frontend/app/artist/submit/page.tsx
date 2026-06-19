"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreatorHubShell } from "@/components/creator-hub/CreatorHubShell";
import { ReleaseChecklist } from "@/components/creator-hub/ReleaseChecklist";
import { track } from "@/lib/analytics";
import { generateArtistPromoAssets } from "@/lib/creatorHub/generators";
import type { ArtistPromoOutput } from "@/lib/creatorHub/generators";
import { mergeCreatorDraft, readCreatorDraft } from "@/lib/creatorHub/draft";

type SubmitResponse = ArtistPromoOutput & {
  submission_id?: string;
};

type FormState = {
  artistName: string;
  contactName: string;
  email: string;
  songTitle: string;
  genre: string;
  vibe: "Chill" | "Hype" | "Late Night" | "Emotional" | "Unsure";
  artistType: string;
  description: string;
  songLink: string;
  versionType: "Explicit" | "Clean";
  producerCredit: string;
  streamingLink: string;
  coverArtLink: string;
  socialLink: string;
  aiUsed: "yes" | "no" | "";
  aiTool: string;
  notes: string;
};

const INITIAL_FORM: FormState = {
  artistName: "",
  contactName: "",
  email: "",
  songTitle: "",
  genre: "",
  vibe: "Chill",
  artistType: "Independent Artist",
  description: "",
  songLink: "",
  versionType: "Clean",
  producerCredit: "",
  streamingLink: "",
  coverArtLink: "",
  socialLink: "",
  aiUsed: "",
  aiTool: "",
  notes: "",
};

const VIBE_OPTIONS = ["Chill", "Hype", "Late Night", "Emotional", "Unsure"] as const;
const ARTIST_TYPES = [
  "Independent Artist",
  "AI-Assisted Artist",
  "Virtual Artist",
  "Producer / Sound Designer",
] as const;

const DISTRIBUTORS = [
  { name: "DistroKid", href: "https://distrokid.com", tag: "Fast uploads" },
  { name: "TuneCore", href: "https://www.tunecore.com", tag: "Publishing tools" },
  { name: "CD Baby", href: "https://cdbaby.com", tag: "One-time releases" },
  { name: "UnitedMasters", href: "https://unitedmasters.com", tag: "Brand sync" },
] as const;

const PRE_DISTRO_CHECKLIST = [
  "Final WAV or high-quality master ready for programming",
  "Cover art sized and export-ready",
  "Exact artist name, song title, and featured artist credits confirmed",
  "Explicit or clean version chosen",
  "Songwriter, producer, and collaborator credits documented",
  "Release date and smart-link plan ready if the track is going wide",
] as const;

const RIGHTS_SECTIONS = [
  {
    title: "Publishing royalties",
    body: "PROs like ASCAP, BMI, and SESAC collect songwriter and composition royalties when your music is publicly performed.",
    links: [
      { label: "ASCAP", href: "https://www.ascap.com" },
      { label: "BMI", href: "https://www.bmi.com" },
      { label: "SESAC", href: "https://www.sesac.com" },
    ],
  },
  {
    title: "Sound recording royalties",
    body: "SoundExchange handles digital performance royalties for the master side when your music is played on non-interactive digital radio.",
    links: [{ label: "SoundExchange", href: "https://www.soundexchange.com" }],
  },
  {
    title: "Mechanical royalties",
    body: "The MLC and publishing administrators help collect mechanical royalties from streams and reproductions of your composition.",
    links: [
      { label: "The MLC", href: "https://themlc.com" },
      { label: "Songtrust", href: "https://songtrust.com" },
    ],
  },
] as const;

const REQUIRED_CHECKS = [
  {
    id: "rights",
    label:
      "I confirm that I own or control the rights to this recording.",
  },
  {
    id: "samples",
    label:
      "I confirm that this song does not contain uncleared samples, or I have permission for all samples used.",
  },
  {
    id: "grant_fsr",
    label:
      "I grant FlowSoundz Radio permission to stream, display, and promote this submitted track on the FlowSoundz Radio platform and social channels.",
  },
  {
    id: "removal",
    label:
      "I understand that approval is not guaranteed and I can request removal by contacting FlowSoundz Radio.",
  },
] as const;

type CheckId = (typeof REQUIRED_CHECKS)[number]["id"];

const INPUT_CLASS =
  "min-h-12 w-full rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#00E5FF]/35";

const TEXTAREA_CLASS =
  "w-full rounded-[1rem] border border-white/8 bg-[#111827] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#00E5FF]/35";

const SELECT_CLASS =
  "min-h-12 w-full rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-white outline-none transition focus:border-[#00E5FF]/35";

export default function SubmitPage() {
  const router = useRouter();
  const startedRef = useRef(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [checks, setChecks] = useState<Record<CheckId, boolean>>({
    rights: false,
    samples: false,
    grant_fsr: false,
    removal: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [prefilledFromStep1, setPrefilledFromStep1] = useState(false);
  // Multi-step wizard: 1 = your track, 2 = music & links, 3 = rights & submit.
  const [step, setStep] = useState(1);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;
    track("artist_submission_started", { source: "artist_submit_page" });

    // Pre-fill from Step 1 concept data if fields are still empty
    try {
      const raw = sessionStorage.getItem("fsz-hub-concept");
      if (!raw) return;
      const concept = JSON.parse(raw) as {
        artistName?: string;
        songIdea?: string;
        genre?: string;
        generated?: { titleIdeas?: string[] };
      };
      const updates = {
        artistName: concept.artistName || "",
        genre: concept.genre || "",
        description: concept.songIdea || "",
        songTitle: concept.generated?.titleIdeas?.[0] || "",
      };
      const hasUpdates = Object.values(updates).some(Boolean);
      if (hasUpdates) {
        setForm((prev) => ({
          ...prev,
          artistName: prev.artistName || updates.artistName,
          genre: prev.genre || updates.genre,
          description: prev.description || updates.description,
          songTitle: prev.songTitle || updates.songTitle,
        }));
        setPrefilledFromStep1(true);
      }
    } catch {}

    const draft = readCreatorDraft();
    setForm((prev) => ({
      ...prev,
      artistName: prev.artistName || draft.artistName || "",
      contactName: prev.contactName || draft.contactName || "",
      email: prev.email || draft.email || "",
      songTitle: prev.songTitle || draft.songTitle || "",
      genre: prev.genre || draft.genre || "",
      vibe: (prev.vibe || draft.vibe || "Chill") as FormState["vibe"],
      artistType: prev.artistType || draft.artistType || "Independent Artist",
      description: prev.description || draft.description || draft.songIdea || "",
      songLink: prev.songLink || draft.songLink || "",
      versionType: (prev.versionType || draft.versionType || "Clean") as FormState["versionType"],
      producerCredit: prev.producerCredit || draft.producerCredit || "",
      streamingLink: prev.streamingLink || draft.streamingLink || "",
      coverArtLink: prev.coverArtLink || draft.coverArtLink || "",
      socialLink: prev.socialLink || draft.socialLink || "",
      aiTool: prev.aiTool || draft.aiTool || "",
      notes: prev.notes || draft.notes || "",
      aiUsed: prev.aiUsed || ((draft.aiUsed as FormState["aiUsed"]) ?? ""),
    }));
  }, []);

  useEffect(() => {
    mergeCreatorDraft({
      artistName: form.artistName,
      contactName: form.contactName,
      email: form.email,
      songTitle: form.songTitle,
      genre: form.genre,
      vibe: form.vibe,
      artistType: form.artistType,
      description: form.description,
      songLink: form.songLink,
      versionType: form.versionType,
      producerCredit: form.producerCredit,
      streamingLink: form.streamingLink,
      coverArtLink: form.coverArtLink,
      socialLink: form.socialLink,
      aiUsed: form.aiUsed,
      aiTool: form.aiTool,
      notes: form.notes,
    });
  }, [form]);

  const allChecked = REQUIRED_CHECKS.every((c) => checks[c.id]);
  const canSubmit =
    form.artistName.trim() &&
    form.contactName.trim() &&
    form.email.trim() &&
    form.songTitle.trim() &&
    form.genre.trim() &&
    form.description.trim() &&
    form.songLink.trim() &&
    // AI disclosure is mandatory: must answer, and name the tool when "yes".
    form.aiUsed !== "" &&
    (form.aiUsed === "no" || form.aiTool.trim()) &&
    allChecked;

  // Per-step gates so we can validate before letting the artist advance —
  // these are strict subsets of canSubmit, so the final guard still holds.
  const STEP_LABELS = ["Your track", "Music & links", "Rights & submit"] as const;
  const step1Valid = Boolean(
    form.artistName.trim() &&
      form.contactName.trim() &&
      form.email.trim() &&
      form.songTitle.trim() &&
      form.genre.trim() &&
      form.description.trim(),
  );
  const step2Valid = Boolean(
    form.songLink.trim() &&
      form.aiUsed !== "" &&
      (form.aiUsed === "no" || form.aiTool.trim()),
  );

  function goToStep(next: number) {
    setError("");
    setStep(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleContinue() {
    if (step === 1 && !step1Valid) {
      setError("Please fill in all required fields before continuing.");
      return;
    }
    if (step === 2 && !step2Valid) {
      setError("Please add your song link and AI disclosure before continuing.");
      return;
    }
    goToStep(step + 1);
  }

  async function handleSubmit() {
    if (!canSubmit) {
      setError(
        "Please fill in all required fields and confirm all checkboxes.",
      );
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      let promo: ArtistPromoOutput;
      let submissionId: string | null = null;

      // Submit to server: AI generation + email notification
      try {
        const res = await fetch("/api/artist/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            artistName: form.artistName,
            contactName: form.contactName,
            email: form.email,
            songTitle: form.songTitle,
            genre: form.genre,
            vibe: form.vibe,
            artistType: form.artistType,
            description: form.description,
            songLink: form.songLink,
            versionType: form.versionType,
            producerCredit: form.producerCredit,
            streamingLink: form.streamingLink,
            coverArtLink: form.coverArtLink,
            socialLink: form.socialLink,
            aiUsed: form.aiUsed === "yes",
            aiTool: form.aiTool,
            rightsConfirmed: checks.rights,
            samplesConfirmed: checks.samples,
            promotionPermissionConfirmed: checks.grant_fsr,
            removalPolicyConfirmed: checks.removal,
            notes: form.notes,
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as SubmitResponse;
          promo = {
            bio: data.bio,
            suggestedVibe: data.suggestedVibe,
            promoBlurb: data.promoBlurb,
            radioIntro: data.radioIntro,
            socialCaptions: data.socialCaptions,
          };
          submissionId = data.submission_id ?? null;
        } else {
          throw new Error("Server fallback");
        }
      } catch {
        // Fall back to client-side generator
        promo = generateArtistPromoAssets({
          artistName: form.artistName,
          songTitle: form.songTitle,
          genre: form.genre,
          vibe: form.vibe,
          artistType: form.artistType,
          description: form.description,
          aiUsed: form.aiUsed === "yes",
          aiTool: form.aiTool,
        });
      }

      // Store in sessionStorage for the confirmation page
      sessionStorage.setItem(
        "fsz-hub-submission",
        JSON.stringify({
          form,
          promo,
          submissionId,
          submittedAt: new Date().toISOString(),
        }),
      );

      track("artist_submission_completed", {
        source: "artist_submit_page",
        vibe: form.vibe,
        genre: form.genre,
        aiUsed: form.aiUsed === "yes",
      });

      router.push("/artist/confirmation");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <CreatorHubShell eyebrow="Creator Hub" title="Submit to FlowSoundz Radio" flowStep="submit">

      {/* ── Wizard progress ── */}
      <div className="mb-6 glass-card rounded-[1.4rem] px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <div key={label} className="flex flex-1 items-center gap-2 last:flex-none">
                <span
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                    active
                      ? "bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] text-white"
                      : done
                        ? "border border-[#00FF88]/30 bg-[#00FF88]/15 text-[#00FF88]"
                        : "border border-white/12 text-white/40"
                  }`}
                >
                  {done ? "✓" : n}
                </span>
                <span
                  className={`hidden text-xs font-semibold sm:inline ${active ? "text-white" : "text-white/45"}`}
                >
                  {label}
                </span>
                {n < STEP_LABELS.length && (
                  <span className="mx-1 hidden h-px flex-1 bg-white/10 sm:block" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Intro (step 1 only) ── */}
      {step === 1 && (
      <div className="mb-8 glass-card rounded-[1.8rem] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
          Submit Your Track
        </p>
        <h2 className="mt-3 text-xl font-semibold text-white sm:text-2xl">
          Submit Your Track for Review
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
          Your song deserves more than a link. Submit here and FlowSoundz Radio will
          review your track for curated rotation — the kind of discovery moment that
          reaches listeners who are actively looking for what&apos;s next.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.2rem] border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300/80">What you get</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-400">✓</span> Manual review by the FlowSoundz curation team</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-400">✓</span> AI-generated bio, vibe tag, promo blurb, and radio intro (all editable)</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-400">✓</span> If approved: rotation on FlowSoundz Radio + artist discovery listing</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-400">✓</span> Email notification if your track is accepted</li>
            </ul>
          </div>
          <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.025] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">What&apos;s not guaranteed</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2"><span className="mt-0.5 text-white/30">—</span> Approval is not automatic — every track is reviewed</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-white/30">—</span> No specific play count, stream guarantee, or chart placement</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-white/30">—</span> AI assets are a starting point — review and edit before use</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-[0.9rem] border border-[#7c4dff]/20 bg-[#7c4dff]/[0.07] px-4 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a78bfa]">AI Disclosure</span>
          <span className="text-xs text-slate-400">After submission, AI-assisted promo assets are generated for your track. These are suggestions only — you review and edit them before they go anywhere.</span>
        </div>
      </div>
      )}

      {/* ── Step 1 pre-fill notice ── */}
      {prefilledFromStep1 && (
        <div className="mb-6 flex items-center gap-3 rounded-[1.2rem] border border-cyan-300/18 bg-cyan-300/[0.06] px-4 py-3">
          <svg className="h-4 w-4 shrink-0 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p className="text-xs text-cyan-100/80">
            Some fields were pre-filled from your Step 1 concept. Review and edit before submitting.
          </p>
        </div>
      )}

      {/* ── Form ── */}
      {step !== 3 && (
      <div className="mb-10 glass-card rounded-[1.8rem] p-6 sm:p-8">
        <div className="grid gap-5">

          {step === 1 && (
          <>
          {/* Row 1: Artist + Contact */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">
                Artist name <span className="text-[#ff2da6]">*</span>
              </span>
              <input
                type="text"
                value={form.artistName}
                onChange={(e) => update("artistName", e.target.value)}
                placeholder="Your artist or group name"
                className={INPUT_CLASS}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">
                Legal name or contact name <span className="text-[#ff2da6]">*</span>
              </span>
              <input
                type="text"
                value={form.contactName}
                onChange={(e) => update("contactName", e.target.value)}
                placeholder="Who we should contact about this submission"
                className={INPUT_CLASS}
              />
            </label>
          </div>

          {/* Row 2: Email + Song */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">
                Email <span className="text-[#ff2da6]">*</span>
              </span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="artist@email.com"
                className={INPUT_CLASS}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">
                Song title <span className="text-[#ff2da6]">*</span>
              </span>
              <input
                type="text"
                value={form.songTitle}
                onChange={(e) => update("songTitle", e.target.value)}
                placeholder="Track name"
                className={INPUT_CLASS}
              />
            </label>
          </div>

          {/* Row 3: Genre + version */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">
                Genre <span className="text-[#ff2da6]">*</span>
              </span>
              <input
                type="text"
                value={form.genre}
                onChange={(e) => update("genre", e.target.value)}
                placeholder="Afrobeats, Alt-R&B, Electronic…"
                className={INPUT_CLASS}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">
                Track version <span className="text-[#ff2da6]">*</span>
              </span>
              <select
                value={form.versionType}
                onChange={(e) =>
                  update("versionType", e.target.value as FormState["versionType"])
                }
                className={SELECT_CLASS}
              >
                <option value="Clean">Clean</option>
                <option value="Explicit">Explicit</option>
              </select>
            </label>
          </div>

          {/* Vibe */}
          <div className="grid gap-2">
            <span className="text-sm font-medium text-white">Station vibe</span>
            <div className="flex flex-wrap gap-2">
              {VIBE_OPTIONS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => update("vibe", v)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    form.vibe === v
                      ? "border-[#00e5ff]/50 bg-[#00e5ff]/15 text-[#00e5ff]"
                      : "border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-white/80">
              Producer credit{" "}
              <span className="font-normal text-white/40">(optional)</span>
            </span>
            <input
              type="text"
              value={form.producerCredit}
              onChange={(e) => update("producerCredit", e.target.value)}
              placeholder="Producer, co-producer, or beat credit"
              className={INPUT_CLASS}
            />
          </label>

          {/* Artist Type */}
          <label className="grid gap-2">
            <span className="text-sm font-medium text-white">Artist type</span>
            <select
              value={form.artistType}
              onChange={(e) => update("artistType", e.target.value)}
              className={SELECT_CLASS}
            >
              {ARTIST_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          {/* Description */}
          <label className="grid gap-2">
            <span className="text-sm font-medium text-white">
              Short artist description <span className="text-[#ff2da6]">*</span>
            </span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Who are you, what is this track about, what makes your sound different?"
              className={TEXTAREA_CLASS}
            />
          </label>
          </>
          )}

          {step === 2 && (
          <>
          <div className="rounded-[1.3rem] border border-cyan-300/16 bg-cyan-300/[0.05] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
              Distribution prep
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              This step now includes the distribution basics so you do not have to leave the flow. If the track is also heading to stores, make sure the release package is complete before you submit it here for radio review.
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Release prep checklist</p>
                <ul className="mt-3 space-y-2.5">
                  {PRE_DISTRO_CHECKLIST.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="mt-0.5 text-cyan-300">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Popular distributors</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {DISTRIBUTORS.map((distributor) => (
                    <a
                      key={distributor.name}
                      href={distributor.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/75 transition hover:border-white/18 hover:text-white"
                    >
                      {distributor.name}
                      <span className="text-white/35">{distributor.tag}</span>
                    </a>
                  ))}
                </div>
                <div className="mt-4">
                  <ReleaseChecklist group="distribution" />
                </div>
                <Link
                  href="/artist/distribution"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-cyan-200/85 transition hover:text-white"
                >
                  Open the full distribution guide →
                </Link>
              </div>
            </div>
          </div>

          {/* Song + Platform Links */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">
                Song link <span className="text-[#ff2da6]">*</span>
              </span>
              <input
                type="url"
                value={form.songLink}
                onChange={(e) => update("songLink", e.target.value)}
                placeholder="SoundCloud, Dropbox, Google Drive, etc."
                className={INPUT_CLASS}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-white text-white/80">
                Spotify / Apple / YouTube / SoundCloud{" "}
                <span className="font-normal text-white/40">(optional)</span>
              </span>
              <input
                type="url"
                value={form.streamingLink}
                onChange={(e) => update("streamingLink", e.target.value)}
                placeholder="Public platform link if already released"
                className={INPUT_CLASS}
              />
            </label>
          </div>

          {/* Cover + Social */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-white/80">
                Cover art link{" "}
                <span className="font-normal text-white/40">(optional)</span>
              </span>
              <input
                type="url"
                value={form.coverArtLink}
                onChange={(e) => update("coverArtLink", e.target.value)}
                placeholder="Image URL or file share link"
                className={INPUT_CLASS}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-white/80">
                Social media{" "}
                <span className="font-normal text-white/40">(optional)</span>
              </span>
              <input
                type="url"
                value={form.socialLink}
                onChange={(e) => update("socialLink", e.target.value)}
                placeholder="Instagram, TikTok, Twitter…"
                className={INPUT_CLASS}
              />
            </label>
          </div>

          {/* AI Use */}
          <div className="grid gap-3">
            <span className="text-sm font-medium text-white">
              Was AI used in the creation of this track? <span className="text-[#FF2DA6]">*</span>
            </span>
            <div className="flex gap-3">
              {(["yes", "no"] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => update("aiUsed", val)}
                  className={`rounded-full border px-5 py-2 text-sm font-semibold capitalize transition ${
                    form.aiUsed === val
                      ? "border-[#7c4dff]/50 bg-[#7c4dff]/15 text-[#7c4dff]"
                      : "border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
            {form.aiUsed === "yes" && (
              <label className="grid gap-2">
                <span className="text-sm font-medium text-white/80">
                  Which AI tool was used?
                </span>
                <input
                  type="text"
                  value={form.aiTool}
                  onChange={(e) => update("aiTool", e.target.value)}
                  placeholder="Suno, Udio, ChatGPT for lyrics, etc."
                  className={INPUT_CLASS}
                />
              </label>
            )}
          </div>

          {/* Notes */}
          <label className="grid gap-2">
            <span className="text-sm font-medium text-white/80">
              Additional notes{" "}
              <span className="font-normal text-white/40">(optional)</span>
            </span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Rollout plans, collaborators, context, or anything the FlowSoundz team should know."
              className={TEXTAREA_CLASS}
            />
          </label>
          </>
          )}
        </div>
      </div>
      )}

      {/* ── Required Checkboxes (step 3) ── */}
      {step === 3 && (
      <div className="mb-8 space-y-6">
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <ReleaseChecklist group="rights" />
            <div className="rounded-[1.4rem] border border-[#7c4dff]/18 bg-[#7c4dff]/[0.06] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200/85">
                Rights note
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                FlowSoundz can help structure your release, but this is still your rights package. If collaborators, samples, stems, AI voice models, or publishing splits are unclear, fix that before the track goes anywhere.
              </p>
              <Link
                href="/artist/rights"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-violet-200 transition hover:text-white"
              >
                Open the full rights guide →
              </Link>
            </div>
          </div>

          <div className="glass-card rounded-[1.8rem] p-6 sm:p-8">
            <h2 className="text-base font-semibold text-white">
              Required Confirmations
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Please review these carefully. They make the submission process clear without promising placement.
            </p>
            <ul className="mt-4 space-y-4">
              {REQUIRED_CHECKS.map((item) => (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checks[item.id]}
                      onChange={(e) =>
                        setChecks((prev) => ({
                          ...prev,
                          [item.id]: e.target.checked,
                        }))
                      }
                      className="mt-0.5 h-4.5 w-4.5 shrink-0 cursor-pointer accent-[#00e5ff]"
                    />
                    <span className="text-sm leading-6 text-slate-300">
                      {item.label}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {RIGHTS_SECTIONS.map((section) => (
            <div key={section.title} className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-sm font-semibold text-white">{section.title}</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">{section.body}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {section.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-white/70 transition hover:border-white/20 hover:text-white"
                  >
                    {link.label} ↗
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="mb-6 rounded-[1.1rem] border border-[#FF2DA6]/20 bg-[#FF2DA6]/10 px-4 py-3 text-sm text-white">
          {error}
        </div>
      )}

      {/* ── Step navigation ── */}
      <div className="mb-10 flex flex-wrap items-center gap-4">
        {step > 1 && (
          <button
            type="button"
            onClick={() => goToStep(step - 1)}
            disabled={isSubmitting}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/5 disabled:opacity-40"
          >
            ← Back
          </button>
        )}

        {step < 3 ? (
          <button
            type="button"
            onClick={handleContinue}
            disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-8 py-3 text-sm font-bold text-white shadow-[0_0_22px_rgba(0,229,255,0.24)] transition hover:shadow-[0_0_36px_rgba(0,229,255,0.44)] disabled:opacity-40"
          >
            Continue →
          </button>
        ) : (
          <button
            type="button"
            disabled={isSubmitting || !canSubmit}
            onClick={() => void handleSubmit()}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-8 py-3 text-sm font-bold text-white shadow-[0_0_22px_rgba(0,229,255,0.24)] transition hover:shadow-[0_0_36px_rgba(0,229,255,0.44)] disabled:opacity-40"
          >
            {isSubmitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="3"
                    strokeDasharray="40" strokeDashoffset="15"
                  />
                </svg>
                Generating AI assets…
              </>
            ) : (
              "✦ Submit & Generate Promo Assets"
            )}
          </button>
        )}

        <p className="text-xs text-slate-500">
          {step < 3 ? (
            <>Step {step} of 3 · fields marked <span className="text-[#ff2da6]">*</span> are required.</>
          ) : (
            <>Confirm all boxes to submit.</>
          )}
        </p>
      </div>
    </CreatorHubShell>
  );
}
