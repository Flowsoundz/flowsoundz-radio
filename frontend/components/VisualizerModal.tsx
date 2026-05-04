"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PremiumAudioVisualizer } from "@/components/PremiumAudioVisualizer";
import { VisualizerCanvasThree } from "@/components/VisualizerCanvasThree";
import { getArtistVisualUrl } from "@/lib/api";
import {
  getStoredVisualizerMode,
  persistVisualizerMode,
  VISUALIZER_MODES,
  type VisualizerModeId,
} from "@/lib/visualizerModes";
import type { Song } from "@/lib/types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  song: Song | null;
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  mode?: VisualizerModeId;
  onModeChange?: (mode: VisualizerModeId) => void;
};

type VisualizerViewId = VisualizerModeId | "youtube" | "artist_visual";

function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match?.[1] ?? "";
}

export function VisualizerModal({
  isOpen,
  onClose,
  song,
  analyser,
  isPlaying,
  mode: controlledMode,
  onModeChange,
}: Props) {
  const [showYouTube, setShowYouTube] = useState(false);
  const [internalMode, setInternalMode] = useState<VisualizerModeId>(getStoredVisualizerMode);
  const [selectedView, setSelectedView] = useState<VisualizerViewId>(
    controlledMode ?? getStoredVisualizerMode(),
  );
  const mode = controlledMode ?? internalMode;
  const youtubeId = song?.youtube_url ? extractYouTubeId(song.youtube_url) : "";
  const artistVisualUrl = song ? getArtistVisualUrl(song) : null;
  const availableViews = useMemo(
    () => [
      ...VISUALIZER_MODES.map((visualizerMode) => ({
        id: visualizerMode.id as VisualizerViewId,
        label: visualizerMode.name,
        summary: visualizerMode.summary,
      })),
      ...(artistVisualUrl
        ? [
            {
              id: "artist_visual" as const,
              label: "Artist Visual",
              summary: "Play the artist-provided hosted visual.",
            },
          ]
        : []),
      ...(youtubeId
        ? [
            {
              id: "youtube" as const,
              label: "Music Video",
              summary: "Play the linked YouTube video.",
            },
          ]
        : []),
    ],
    [artistVisualUrl, youtubeId],
  );
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const updateMode = useCallback(
    (nextMode: VisualizerModeId) => {
      if (controlledMode === undefined) {
        setInternalMode(nextMode);
      }

      persistVisualizerMode(nextMode);
      onModeChange?.(nextMode);
      setSelectedView(nextMode);
    },
    [controlledMode, onModeChange],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelectedView(mode);
  }, [isOpen, mode, song?.id]);

  useEffect(() => {
    if (availableViews.some((view) => view.id === selectedView)) {
      return;
    }

    setSelectedView(mode);
  }, [availableViews, mode, selectedView]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  const isGeneratedMode = selectedView === "aurora" || selectedView === "liquid";

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-[#010510]"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      {selectedView === "youtube" && youtubeId ? (
        <div className="absolute inset-0">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&controls=1`}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      ) : selectedView === "artist_visual" && artistVisualUrl ? (
        <video
          src={artistVisualUrl}
          className="absolute inset-0 h-full w-full object-cover"
          controls
          autoPlay
          loop
        />
      ) : selectedView === "aurora" ? (
        <VisualizerCanvasThree
          isPlaying={isPlaying}
          analyser={analyser}
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <PremiumAudioVisualizer
          isPlaying={isPlaying}
          analyser={analyser}
          className="absolute inset-0 h-full w-full"
          fullHeight
          showFrame={false}
          showLogo={false}
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(1,5,16,0.38)_100%),linear-gradient(180deg,transparent_55%,rgba(1,5,16,0.72)_100%)]" />

      <div className={`pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 ${isGeneratedMode ? "" : "hidden"}`}>
        <Image
          src="/FSRLogo.svg"
          alt="FlowSoundz Radio"
          width={300}
          height={96}
          priority
          className={`h-auto w-[clamp(200px,24vw,300px)] ${
            selectedView === "aurora" ? "viz-logo opacity-100" : "opacity-85 drop-shadow-[0_0_20px_rgba(0,229,255,0.24)]"
          }`}
        />
        <p className="text-[10px] font-semibold uppercase tracking-[0.40em] text-white/30">
          Feel the Flow. Hear the Frequency.
        </p>
      </div>

      <div className="absolute left-1/2 top-5 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/12 bg-black/25 p-1 backdrop-blur-md">
        {availableViews.map((view) => {
          const active = view.id === selectedView;

          return (
            <button
              key={view.id}
              type="button"
              onClick={() => {
                if (view.id === "aurora" || view.id === "liquid") {
                  updateMode(view.id);
                  return;
                }
                setSelectedView(view.id);
              }}
              className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                active
                  ? "bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_60%,#ff3df2_100%)] text-white"
                  : "text-white/60 hover:text-white"
              }`}
              title={view.summary}
            >
              {view.label}
            </button>
          );
        })}
      </div>

      <button
        onClick={handleClose}
        className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white/60 transition hover:bg-white/15 hover:text-white"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div className="pointer-events-none absolute bottom-10 inset-x-0 z-10 text-center">
        <p className="font-headline text-[clamp(20px,3vw,48px)] uppercase leading-none text-white drop-shadow-[0_0_32px_rgba(0,229,255,0.40)]">
          {song?.title ?? "Now Playing"}
        </p>
        <p className="mt-2 text-sm text-white/45">{song?.artist}</p>
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.34em] text-white/28">
          {availableViews.find((view) => view.id === selectedView)?.label}
        </p>
      </div>
    </div>
  );
}
