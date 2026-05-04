"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { PremiumAudioVisualizer } from "@/components/PremiumAudioVisualizer";
import { VisualizerCanvasThree } from "@/components/VisualizerCanvasThree";
import { AudioUploader } from "@/components/visualizer/AudioUploader";
import { slugifyArtistName } from "@/lib/artists";
import {
  getStoredVisualizerMode,
  persistVisualizerMode,
  VISUALIZER_MODES,
  type VisualizerModeId,
} from "@/lib/visualizerModes";

type Props = {
  initialArtistName?: string;
};

export function ConnectedVisualizerStudio({ initialArtistName }: Props) {
  const artistInputId = useId();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [artistName, setArtistName] = useState(
    initialArtistName?.trim() || "FlowSoundz Radio",
  );
  const [mode, setMode] = useState<VisualizerModeId>(getStoredVisualizerMode);
  const [isPlaying, setIsPlaying] = useState(false);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [trackLabel, setTrackLabel] = useState("Idle preview");

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
        await audio.play();
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
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/70">
            Connected Mode
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
              {audioFile?.name ?? "Load a local track"}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {trimmedArtistName || "FlowSoundz Radio"}
            </p>
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
              Artist Loop
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Jump from studio to artist profile, then back into the studio with the artist name prefilled.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
