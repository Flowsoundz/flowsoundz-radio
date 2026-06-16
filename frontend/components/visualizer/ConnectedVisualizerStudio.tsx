"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { PremiumAudioVisualizer } from "@/components/PremiumAudioVisualizer";
import { VisualizerCanvasThree } from "@/components/VisualizerCanvasThree";
import { AudioUploader } from "@/components/visualizer/AudioUploader";
import { slugifyArtistName } from "@/lib/artists";
import { playTrack } from "@/lib/playbackController";
import { exportPromoVideo, type PromoTheme } from "@/lib/promoVideo";
import {
  getStoredVisualizerMode,
  persistVisualizerMode,
  VISUALIZER_MODES,
  type VisualizerModeId,
} from "@/lib/visualizerModes";

type Props = {
  initialArtistName?: string;
  initialTrackTitle?: string;
  initialPersonaLabel?: string;
  initialExportTarget?: string;
};

const EXPORT_TARGETS = [
  {
    id: "tiktok",
    label: "TikTok",
    format: "9:16 vertical loop",
    guidance: "Fast hook, bold text overlays, and movement in the first second.",
  },
  {
    id: "reels",
    label: "Reels",
    format: "9:16 social cut",
    guidance: "Favor clean artist/title framing and a strong middle section for reshares.",
  },
  {
    id: "shorts",
    label: "Shorts",
    format: "9:16 discovery cut",
    guidance: "Lead with the strongest visual moment and keep branding readable on mobile.",
  },
] as const;

// Promo render color themes per visual mode (falls back to brand cyan/violet).
const EXPORT_THEMES: Record<string, PromoTheme> = {
  aurora: { bg: "#06121f", accent: "#00e5ff", accent2: "#7c4dff" },
  liquid: { bg: "#140a1f", accent: "#FF2DA6", accent2: "#7c4dff" },
};
const DEFAULT_THEME: PromoTheme = { bg: "#0c1328", accent: "#00e5ff", accent2: "#7c4dff" };
const EXPORT_LENGTHS = [15, 20, 30] as const;

export function ConnectedVisualizerStudio({
  initialArtistName,
  initialTrackTitle,
  initialPersonaLabel,
  initialExportTarget,
}: Props) {
  const artistInputId = useId();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [artistName, setArtistName] = useState(
    initialArtistName?.trim() || "FlowSoundz Radio",
  );
  const [mode, setMode] = useState<VisualizerModeId>("aurora");
  const [isPlaying, setIsPlaying] = useState(false);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [trackLabel, setTrackLabel] = useState(initialTrackTitle?.trim() || "Idle preview");
  const [shareCopied, setShareCopied] = useState(false);
  const [exportTargetId, setExportTargetId] = useState(
    EXPORT_TARGETS.some((target) => target.id === initialExportTarget)
      ? (initialExportTarget as (typeof EXPORT_TARGETS)[number]["id"])
      : "tiktok",
  );

  // Promo-video export state
  const [exportSeconds, setExportSeconds] = useState<number>(20);
  const [isExporting, setIsExporting] = useState(false);
  const [exportPhase, setExportPhase] = useState<"recording" | "transcoding" | null>(null);
  const [exportPct, setExportPct] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportAbortRef = useRef<AbortController | null>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.crossOrigin = "anonymous";

    const handlePlay = () => {
      setIsPlaying(true);
      setTrackLabel("Preview running");
    };
    const handlePause = () => {
      setIsPlaying(false);
      if (audio.currentTime > 0 && !audio.ended) {
        setTrackLabel("Preview paused");
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setTrackLabel("Playback ended");
    };
    const handleError = () => {
      setPlaybackError("This audio file could not be played in the browser.");
      setTrackLabel("Playback unavailable");
      setIsPlaying(false);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      audioContextRef.current?.close().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setPlaybackError(null);

    if (!audioFile) {
      audio.removeAttribute("src");
      audio.load();
      return;
    }

    const objectUrl = URL.createObjectURL(audioFile);
    objectUrlRef.current = objectUrl;
    audio.src = objectUrl;
    audio.load();
  }, [audioFile]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMode(getStoredVisualizerMode());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    persistVisualizerMode(mode);
  }, [mode]);

  async function ensureAnalyser() {
    const audio = audioRef.current;
    if (!audio) {
      return null;
    }

    if (!audioContextRef.current) {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.45;

      const sourceNode = audioContext.createMediaElementSource(audio);
      sourceNode.connect(analyser);
      analyser.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      setAnalyserNode(analyser);
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    return analyserRef.current;
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (!audioFile) {
      setPlaybackError("Choose a local audio file first.");
      return;
    }

    setPlaybackError(null);

    if (audio.paused) {
      try {
        await ensureAnalyser();
        await playTrack(audioRef, {
          id: objectUrlRef.current ?? audioFile.name,
          src: audio.currentSrc || audio.src,
        });
      } catch {
        setPlaybackError("Playback was blocked. Try tapping play again.");
        setIsPlaying(false);
      }
      return;
    }

    audio.pause();
  }

  const trimmedArtistName = artistName.trim();
  const artistSlug = trimmedArtistName ? slugifyArtistName(trimmedArtistName) : "";
  const exportTarget =
    EXPORT_TARGETS.find((target) => target.id === exportTargetId) ?? EXPORT_TARGETS[0];
  const promoBriefTitle =
    initialTrackTitle?.trim() ||
    `${trimmedArtistName || "FlowSoundz"} ${exportTarget.label} Promo`;

  async function handleSharePreview() {
    const shareMessage = `${trimmedArtistName || "FlowSoundz Radio"} visualizer preview — ${audioFile?.name ?? "local track"} • Built in FlowSoundz Visualizer Studio`;

    if (navigator.share) {
      await navigator.share({
        title: "FlowSoundz Visualizer Studio",
        text: shareMessage,
        url: `${window.location.origin}/visualizer`,
      }).catch(() => undefined);
      return;
    }

    await navigator.clipboard.writeText(`${shareMessage} ${window.location.origin}/visualizer`);
    setShareCopied(true);
    window.setTimeout(() => setShareCopied(false), 2200);
  }

  function cancelExport() {
    exportAbortRef.current?.abort();
  }

  async function handleExportVideo() {
    if (!audioFile) {
      setExportError("Upload a track first, then export.");
      return;
    }
    setExportError(null);
    setIsExporting(true);
    setExportPhase("recording");
    setExportPct(0);
    const abort = new AbortController();
    exportAbortRef.current = abort;

    try {
      const analyser = await ensureAnalyser();
      const audio = audioRef.current;
      const audioContext = audioContextRef.current;
      if (!analyser || !audio || !audioContext) {
        throw new Error("Audio engine isn't ready — press play once, then export.");
      }

      // Load the brand wordmark once (raster = reliable on canvas).
      if (!logoImgRef.current) {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.src = "/brand/flowsoundz-radio-wordmark-transparent.png";
        await img.decode().catch(() => undefined);
        logoImgRef.current = img;
      }

      const theme = EXPORT_THEMES[mode] ?? DEFAULT_THEME;
      const trackTitle =
        initialTrackTitle?.trim() || audioFile.name.replace(/\.[^.]+$/, "");
      const pageUrl = artistSlug
        ? `flowsoundzradio.com/artists/${artistSlug}`
        : "flowsoundzradio.com";

      const blob = await exportPromoVideo({
        audioEl: audio,
        audioContext,
        analyser,
        width: 1080,
        height: 1920,
        durationMs: exportSeconds * 1000,
        artistName: trimmedArtistName || "FlowSoundz",
        trackTitle,
        theme,
        logo: logoImgRef.current,
        pageUrl,
        onProgress: (phase, pct) => {
          setExportPhase(phase);
          setExportPct(pct);
        },
        signal: abort.signal,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(trimmedArtistName || "flowsoundz").replace(/\s+/g, "-").toLowerCase()}-flowsoundz-promo.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setExportError(err instanceof Error ? err.message : "Export failed. Try again.");
      }
    } finally {
      setIsExporting(false);
      setExportPhase(null);
      setExportPct(0);
      exportAbortRef.current = null;
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(320px,0.94fr)_minmax(0,1.42fr)]">
      <div className="space-y-4">
        <AudioUploader
          file={audioFile}
          onFileChange={(file) => {
            setAudioFile(file);
            setTrackLabel(file?.name ?? "Idle preview");
          }}
          onClear={() => {
            setAudioFile(null);
            setTrackLabel("Idle preview");
          }}
        />

        <div className="glass-card rounded-[1.75rem] border border-white/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-fuchsia-200/75">
            Creator handoff
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">Promo brief is already loaded</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            The Creator Hub can hand artist context directly into the studio so Step 5 feels like
            a real production lane, not a dead-end link.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1rem] border border-white/8 bg-white/[0.03] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Artist
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {trimmedArtistName || "FlowSoundz Radio"}
              </p>
            </div>
            <div className="rounded-[1rem] border border-white/8 bg-white/[0.03] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Promo brief
              </p>
              <p className="mt-2 text-sm font-semibold text-white">{promoBriefTitle}</p>
            </div>
            <div className="rounded-[1rem] border border-white/8 bg-white/[0.03] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Creator lane
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {initialPersonaLabel || "General release"}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-[1.75rem] border border-fuchsia-400/14 bg-fuchsia-500/[0.04] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/70">
            Export target
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">Build for the platform you need</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Pick a destination and the studio will frame the promo around that short-form format.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            {EXPORT_TARGETS.map((target) => {
              const active = target.id === exportTargetId;

              return (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => setExportTargetId(target.id)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] transition ${
                    active
                      ? "border-fuchsia-300/28 bg-[linear-gradient(135deg,rgba(255,45,166,0.15),rgba(124,77,255,0.16),rgba(0,229,255,0.12))] text-white shadow-[0_0_28px_rgba(255,45,166,0.12)]"
                      : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/18 hover:text-white"
                  }`}
                  title={target.guidance}
                >
                  {target.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-[1rem] border border-white/8 bg-black/20 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fuchsia-200/75">
              Active format
            </p>
            <p className="mt-2 text-sm font-semibold text-white">{exportTarget.format}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{exportTarget.guidance}</p>
          </div>

          {/* ── Real promo-video export (records visualizer + audio → branded MP4) ── */}
          <div className="mt-4 border-t border-white/8 pt-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fuchsia-200/75">
                Clip length
              </p>
              <div className="flex gap-1.5">
                {EXPORT_LENGTHS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={isExporting}
                    onClick={() => setExportSeconds(s)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                      exportSeconds === s
                        ? "border-cyan-300/40 bg-cyan-300/15 text-white"
                        : "border-white/10 bg-white/[0.03] text-slate-300 hover:text-white"
                    }`}
                  >
                    {s}s
                  </button>
                ))}
              </div>
            </div>

            {isExporting ? (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>{exportPhase === "transcoding" ? "Converting to MP4…" : "Recording…"}</span>
                  <span>{Math.round(exportPct * 100)}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#00e5ff,#7c4dff)] transition-all"
                    style={{ width: `${Math.round(exportPct * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  {exportPhase === "recording"
                    ? "Plays your track in real time while recording — keep this tab open and focused."
                    : "Final MP4 encode (first run loads the in-browser encoder, ~25MB)."}
                </p>
                <button
                  type="button"
                  onClick={cancelExport}
                  className="mt-3 rounded-full border border-white/15 px-4 py-1.5 text-xs font-semibold text-slate-300 transition hover:text-white"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void handleExportVideo()}
                disabled={!audioFile}
                className="mt-4 w-full rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-5 py-3 text-sm font-bold text-white shadow-[0_0_22px_rgba(0,229,255,0.3)] transition hover:shadow-[0_0_36px_rgba(0,229,255,0.5)] disabled:opacity-40"
              >
                ⬇ Export promo video — MP4 · 1080×1920
              </button>
            )}

            {exportError ? (
              <p className="mt-3 rounded-[0.9rem] border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-2 text-xs text-fuchsia-100">
                {exportError}
              </p>
            ) : !audioFile && !isExporting ? (
              <p className="mt-2 text-[11px] text-slate-500">Upload a track above to enable export.</p>
            ) : null}
          </div>
        </div>

        <div className="glass-card rounded-[1.75rem] border border-white/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/70">
            Visual engine
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">Shared with radio visualizer</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Switch the look here and the radio fullscreen visualizer follows the same mode instantly.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            {VISUALIZER_MODES.map((visualizerMode) => {
              const active = visualizerMode.id === mode;

              return (
                <button
                  key={visualizerMode.id}
                  type="button"
                  onClick={() => setMode(visualizerMode.id)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] transition ${
                    active
                      ? "border-cyan-300/28 bg-[linear-gradient(135deg,rgba(0,229,255,0.15),rgba(124,77,255,0.14),rgba(255,61,242,0.12))] text-white shadow-[0_0_28px_rgba(0,229,255,0.12)]"
                      : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/18 hover:text-white"
                  }`}
                  title={visualizerMode.summary}
                >
                  {visualizerMode.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="glass-card rounded-[1.75rem] border border-white/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/70">
            Artist Display
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">Preview label and profile loop</h2>

          <label
            htmlFor={artistInputId}
            className="mt-4 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"
          >
            Artist Name
          </label>
          <input
            id={artistInputId}
            type="text"
            value={artistName}
            onChange={(event) => setArtistName(event.target.value)}
            placeholder="FlowSoundz Radio"
            className="mt-2 w-full rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/35 focus:bg-cyan-300/[0.04]"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            {artistSlug ? (
              <Link
                href={`/artists/${artistSlug}`}
                className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 transition hover:border-cyan-300/28 hover:bg-cyan-300/[0.16] hover:text-white"
              >
                View artist profile
              </Link>
            ) : null}
            <Link
              href={`/artists`}
              className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-white/18 hover:text-white"
            >
              Browse artists
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={togglePlayback}
              className="rounded-full bg-[linear-gradient(135deg,#5de0ff_0%,#627bff_52%,#8b5cff_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(51,117,255,0.28)] transition hover:scale-[1.01]"
            >
              {isPlaying ? "Pause preview" : "Play preview"}
            </button>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-slate-300">
              {trackLabel}
            </span>
            <button
              type="button"
              onClick={() => void handleSharePreview()}
              className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-300/[0.16]"
            >
              {shareCopied ? "Link copied" : "Share preview"}
            </button>
          </div>

          {playbackError ? (
            <p className="mt-4 rounded-[1rem] border border-fuchsia-400/18 bg-fuchsia-500/10 px-4 py-3 text-sm text-fuchsia-100">
              {playbackError}
            </p>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Audio stays local. The analyser is only created after you press play.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div
          className="relative overflow-hidden rounded-[1.95rem] border border-white/10 bg-[#050816] shadow-[0_28px_90px_rgba(2,6,23,0.45)]"
          style={{ height: "clamp(240px, 28vw, 360px)" }}
        >
          {mode === "aurora" ? (
            <>
              <VisualizerCanvasThree
                analyser={analyserNode}
                isPlaying={isPlaying}
                isActive
                className="absolute inset-0 h-full w-full"
              />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_18%,rgba(1,5,16,0.18)_56%,rgba(1,5,16,0.74)_100%)]" />
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <Image
                  src="/FSRLogo.svg"
                  alt="FlowSoundz Radio"
                  width={240}
                  height={76}
                  className="h-auto w-[clamp(160px,20vw,240px)] opacity-95 drop-shadow-[0_0_22px_rgba(0,229,255,0.24)]"
                  priority
                />
              </div>
            </>
          ) : (
            <PremiumAudioVisualizer
              analyser={analyserNode}
              isPlaying={isPlaying}
              isActive
              className="absolute inset-0 h-full w-full"
              fullHeight
              showFrame={false}
              showLogo
            />
          )}

          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/52">
            <span>FlowSoundz Studio</span>
            <span>{VISUALIZER_MODES.find((visualizerMode) => visualizerMode.id === mode)?.name}</span>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-[linear-gradient(180deg,rgba(1,5,16,0)_0%,rgba(1,5,16,0.26)_32%,rgba(1,5,16,0.82)_100%)] px-5 pb-5 pt-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-200/68">
              Connected to radio modal
            </p>
            <p className="mt-2 text-xl font-semibold text-white">
              {audioFile?.name ?? promoBriefTitle}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {trimmedArtistName || "FlowSoundz Radio"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">
                {exportTarget.label}
              </span>
              {initialPersonaLabel ? (
                <span className="rounded-full border border-fuchsia-400/18 bg-fuchsia-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-fuchsia-100">
                  {initialPersonaLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="glass-card rounded-[1.45rem] border border-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/70">
              Shared Visuals
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              `/visualizer` and the radio modal now use the same `Aurora Field` and `Liquid Mercury` renderers.
            </p>
          </div>
          <div className="glass-card rounded-[1.45rem] border border-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/70">
              Local Audio
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Upload a song, press play, and the preview runs through the same analyser-driven motion stack as radio.
            </p>
          </div>
          <div className="glass-card rounded-[1.45rem] border border-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/70">
              Export Presets
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Start with TikTok, Reels, or Shorts framing. This keeps Step 5 focused on promo production instead of generic experimentation.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <div className="glass-card rounded-[1.45rem] border border-white/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/70">
              Share Engine
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white">
              Turn every preview into social promotion
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Export a branded, audio-synced promo clip with one tap (Export target panel), then post it
              straight to Reels, TikTok, or Shorts — every clip carries your name and a link back to
              your FlowSoundz page.
            </p>
          </div>
          <div className="glass-card rounded-[1.45rem] border border-fuchsia-400/14 bg-fuchsia-500/[0.04] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fuchsia-200/75">
              Premium templates
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white">
              Particle-heavy scenes coming to membership
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Aurora Field and Liquid Mercury are live now. Advanced shader packs, heavier particle presets, and export-ready layouts are reserved for premium rollout.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
