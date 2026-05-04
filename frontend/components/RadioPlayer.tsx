"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics";
import { useGlobalAudio } from "@/components/GlobalAudioProvider";
import { playTrack } from "@/lib/playbackController";
import {
  DEFAULT_USER_TIER,
  canUserTierAccessTrack,
  isTrackFeatured,
  isTrackInMembersEarlyWindow,
} from "@/lib/access";
import { slugifyArtistName } from "@/lib/artists";
import { CoverArt } from "@/components/CoverArt";
import {
  canUseNativeHls,
  getCoverUrl,
  getDefaultCoverUrl,
  getHlsUrl,
  getPreferredPlaybackUrl,
  getQueue,
} from "@/lib/api";
import { fadeAudioOut } from "@/lib/audioFades";
import { formatVibeLabel } from "@/lib/format";
import { getDJPersonality } from "@/lib/djPersonalities";
import { AiDjChat } from "@/components/AiDjChat";
import { getNarrationEventForVibe, type NarrationEvent } from "@/lib/narration";
import {
  getTransitionBedForVibe,
  isTransitionBedSrc,
  type TransitionBed,
} from "@/lib/transitionBeds";
import {
  DJ_DROPS,
  getDropPlaybackSrc,
  getForcedTestDropCandidate,
  getPlannedDrop,
  getRandomDropInterval,
} from "@/lib/radioDrops";
import {
  getTransitionPlan,
  type TransitionPlan,
  type TransitionType,
} from "@/lib/transitionPlanner";
import type { Song } from "@/lib/types";
import { VisualizerCanvasThree } from "@/components/VisualizerCanvasThree";
import {
  type VisualizerModeId,
} from "@/lib/visualizerModes";
import type Hls from "hls.js";

const VisualizerModal = dynamic(
  () =>
    import("@/components/VisualizerModal").then((module) => ({
      default: module.VisualizerModal,
    })),
  {
    ssr: false,
  },
);

let hlsModulePromise: Promise<typeof import("hls.js")> | null = null;

async function loadHlsModule() {
  if (!hlsModulePromise) {
    hlsModulePromise = import("hls.js");
  }

  return hlsModulePromise;
}

const VIBE_OPTIONS = ["all", "chill", "hype", "late_night", "emotional"];
const ENABLE_DJ_DROPS = true;
const FADE_DURATION_MS = 500;
const FADE_STEPS = 6;
const DROP_TO_TRACK_DELAY_MS = 220;
const AUTO_NEXT_FADE_BUFFER_MS = 80;
const NARRATION_TRANSITION_PROBABILITY = 0.3;
const MAX_RECENT_DROP_HISTORY = 5;
const MAX_RECENT_BED_HISTORY = 3;
const LIVE_LISTENER_MIN = 20;
const LIVE_LISTENER_MAX = 150;
const LIVE_LISTENER_UPDATE_MS = 30_000;
const TRACKS_TODAY_STORAGE_KEY = "flowsoundz-tracks-today";
const RADIO_PLAYER_STATE_STORAGE_KEY = "flowsoundz-radio-player-state";
const RADIO_BACKEND_ERROR =
  "Station backend offline. Start the API at http://127.0.0.1:8000 to load the live queue.";

// ── Strip wave SVG paths (computed once at module load) ──────────────────
// ViewBox is 200×32. Two SVGs each rendered at width:200% of their container
// and animated with translateX(-50%) — seamless loop because each wave completes
// an even number of full cycles in the 200-unit viewBox.
function buildSinePath(
  vW: number, vH: number,
  cycles: number, amp: number, phase: number,
): string {
  const N = cycles * 20;
  return Array.from({ length: N + 1 }, (_, i) => {
    const x = (i / N) * vW;
    const y = vH / 2 + amp * Math.sin((i / N) * cycles * Math.PI * 2 + phase);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}
const STRIP_WAVE_CYAN   = buildSinePath(200, 32, 4, 9.0, 0);
const STRIP_WAVE_PURPLE = buildSinePath(200, 32, 6, 7.0, Math.PI * 0.6);

const FORCE_DROP_TEST_MODE = false;
const FORCED_DROP_TEST_VOLUME = 1;
const SHOW_COVER_ART = true;
type PlayedSong = {
  id: string;
  title: string;
  artist: string;
  vibe?: string;
  coverUrl: string | string[] | null;
};

type PreparedStationEvent = {
  forSongId: string;
  nextIndex: number;
  nextSong: Song;
  plan: TransitionPlan;
  plannedDrop: ReturnType<typeof getPlannedDrop>;
  plannedNarration: NarrationEvent;
  plannedBed: TransitionBed | null;
  transitionAudioMode: "drop" | "narration" | "direct";
};

type PersistedRadioPlayerState = {
  songId: string | null;
  selectedVibe: string;
  currentTime: number;
  shouldPlay: boolean;
};

function getTransitionSource(
  transitionAudioMode: PreparedStationEvent["transitionAudioMode"],
): "forced" | "drop" | "narration" | "direct" {
  if (FORCE_DROP_TEST_MODE) {
    return "forced";
  }

  return transitionAudioMode;
}

function getInitialTracksTodayCount(): number {
  if (typeof window === "undefined") {
    return 0;
  }

  const today = new Date().toISOString().slice(0, 10);

  try {
    const raw = window.localStorage.getItem(TRACKS_TODAY_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(
        TRACKS_TODAY_STORAGE_KEY,
        JSON.stringify({ date: today, count: 0 }),
      );
      return 0;
    }

    const parsed = JSON.parse(raw) as { date?: string; count?: number };
    if (parsed.date !== today) {
      window.localStorage.setItem(
        TRACKS_TODAY_STORAGE_KEY,
        JSON.stringify({ date: today, count: 0 }),
      );
      return 0;
    }

    return typeof parsed.count === "number" && parsed.count > 0
      ? parsed.count
      : 0;
  } catch {
    return 0;
  }
}

function getInitialSelectedVibe(): string {
  if (typeof window === "undefined") {
    return "all";
  }

  try {
    const raw = window.localStorage.getItem(RADIO_PLAYER_STATE_STORAGE_KEY);
    if (!raw) {
      return "all";
    }

    const parsed = JSON.parse(raw) as Partial<PersistedRadioPlayerState>;
    return typeof parsed.selectedVibe === "string" && parsed.selectedVibe.length > 0
      ? parsed.selectedVibe
      : "all";
  } catch {
    return "all";
  }
}

function getPersistedRadioPlayerState(): PersistedRadioPlayerState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(RADIO_PLAYER_STATE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedRadioPlayerState>;
    return {
      songId: typeof parsed.songId === "string" ? parsed.songId : null,
      selectedVibe:
        typeof parsed.selectedVibe === "string" && parsed.selectedVibe.length > 0
          ? parsed.selectedVibe
          : "all",
      currentTime:
        typeof parsed.currentTime === "number" && Number.isFinite(parsed.currentTime)
          ? Math.max(0, parsed.currentTime)
          : 0,
      shouldPlay: Boolean(parsed.shouldPlay),
    };
  } catch {
    return null;
  }
}

function formatClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function shouldUseNarrationTransition() {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0] / 0x100000000 < NARRATION_TRANSITION_PROBABILITY;
  }

  return Math.random() < NARRATION_TRANSITION_PROBABILITY;
}

function fadeOutAudio(audio: HTMLAudioElement, durationMs = FADE_DURATION_MS) {
  if (audio.paused || audio.volume <= 0) {
    audio.pause();
    audio.volume = 1;
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const startingVolume = audio.volume;
    const stepDelay = Math.max(durationMs / FADE_STEPS, 16);
    let step = 0;

    const timer = window.setInterval(() => {
      step += 1;
      audio.volume = Math.max(startingVolume * (1 - step / FADE_STEPS), 0);

      if (step >= FADE_STEPS) {
        window.clearInterval(timer);
        audio.pause();
        audio.volume = 1;
        resolve();
      }
    }, stepDelay);
  });
}

function resetAudioElement(audio: HTMLAudioElement | null) {
  if (!audio) {
    return;
  }

  audio.pause();
  audio.currentTime = 0;
  audio.loop = false;
  audio.volume = 1;
}

function clearTransitionAudioStopTimer(timerRef: { current: number | null }) {
  if (timerRef.current !== null) {
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

function prepareBedAudio(
  audio: HTMLAudioElement | null,
  bed: TransitionBed | null,
) {
  if (!audio) {
    return;
  }

  if (!bed?.src) {
    console.log("[BED PRELOAD]", {
      bedId: null,
      bedSrc: null,
      reason: "no_bed",
    });
    resetAudioElement(audio);
    return;
  }

  audio.src = bed.src;
  audio.preload = "metadata";
  audio.load();

  console.log("[BED PRELOAD]", {
    bedId: bed.id,
    bedSrc: bed.src,
    vibe: bed.vibe,
  });
}

export default function RadioPlayer() {
  const {
    audioRef,
    analyserRef: sharedAnalyserRef,
    isReady: isAudioReady,
    setCurrentTrack,
    togglePlaybackRef,
    skipTrackRef,
  } = useGlobalAudio();
  const pathname = usePathname();
  const isFullView = pathname === "/radio";
  const sectionRef = useRef<HTMLElement | null>(null);
  const dropAudioRef = useRef<HTMLAudioElement | null>(null);
  const transitionBedAudioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const dropPlaybackTokenRef = useRef(0);
  const transitionAudioModeRef = useRef<"drop" | "narration" | null>(null);
  const nextTrackPreloadRef = useRef<HTMLAudioElement | null>(null);
  const nextDropPreloadRef = useRef<HTMLAudioElement | null>(null);
  const nextBedPreloadRef = useRef<HTMLAudioElement | null>(null);
  const pendingTrackIndexRef = useRef<number | null>(null);
  const transitionInFlightRef = useRef(false);
  const transitionAudioStopTimerRef = useRef<number | null>(null);
  const recentDropIdsRef = useRef<string[]>([]);
  const recentBedIdsRef = useRef<string[]>([]);
  const previousSongIdRef = useRef<string | undefined>(undefined);
  const previousTransitionTypeRef = useRef<TransitionType | null>(null);
  const countedTrackIdRef = useRef<string | null>(null);
  const transitionCopyTokenRef = useRef(0);
  const transitionCopyCacheRef = useRef<Map<string, string>>(new Map());
  const pendingRestoreStateRef = useRef<PersistedRadioPlayerState | null>(null);
  const isSkippingRef = useRef(false);
  const isPlayingRef = useRef(false);
  const isDropPlayingRef = useRef(false);
  const currentTrackIdRef = useRef<string | null>(null);
  const requestedTrackStartIdRef = useRef<string | null>(null);
  const activeTrackSourceKeyRef = useRef<string | null>(null);
  const skipToNextTrackRef = useRef<() => Promise<void>>(async () => {});
  const handleTimeUpdateRef = useRef<() => void>(() => {});
  const handleLoadedMetadataRef = useRef<() => void>(() => {});

  const [showVisualizer, setShowVisualizer] = useState(false);
  const [queue, setQueue] = useState<Song[]>([]);
  const [selectedVibe, setSelectedVibe] = useState("all");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDropPlaying, setIsDropPlaying] = useState(false);
  const [activeDropLabel, setActiveDropLabel] = useState("");
  const [songsUntilDrop, setSongsUntilDrop] = useState(3);
  const [shouldPlay, setShouldPlay] = useState(true);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [liveListeners, setLiveListeners] = useState(1247);
  const [tracksToday, setTracksToday] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);
  const [visualizerAnalyser, setVisualizerAnalyser] =
    useState<AnalyserNode | null>(null);
  const [visualizerMode, setVisualizerMode] =
    useState<VisualizerModeId>("aurora");
  const [currentTransitionPlan, setCurrentTransitionPlan] =
    useState<TransitionPlan | null>(null);
  const [recentlyPlayed, setRecentlyPlayed] = useState<PlayedSong[]>([]);
  const [preparedEvent, setPreparedEvent] = useState<PreparedStationEvent | null>(null);
  const songsUntilDropRef = useRef(songsUntilDrop);
  const currentUserTier = DEFAULT_USER_TIER;

  const defaultCoverUrl = getDefaultCoverUrl();
  const currentSong = queue[currentIndex] ?? null;
  const currentCoverUrl = currentSong ? getCoverUrl(currentSong) : null;
  const ambientCoverActive =
    Boolean(currentSong) &&
    !isDropPlaying &&
    (Array.isArray(currentCoverUrl) ? currentCoverUrl : [currentCoverUrl]).some(
      (src) => Boolean(src) && src !== defaultCoverUrl,
    );
  const currentSongIsLocked = currentSong
    ? !canUserTierAccessTrack(currentSong, currentUserTier)
    : false;
  const currentSongAccessLabel = currentSong
    ? currentSong.is_vault
      ? "Vault"
      : isTrackInMembersEarlyWindow(currentSong)
        ? "Members Early"
        : isTrackFeatured(currentSong)
          ? "Featured"
          : null
    : null;
  const activeDJ = getDJPersonality(
    selectedVibe === "all" ? "chill" : selectedVibe,
  );
  const waitingTitle = "Tuning signal";
  const waitingArtist = "Connecting to station";
  const progressPercent =
    duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
  const currentBed = preparedEvent?.plannedBed ?? null;
  const usingLocalCatalog = queue.some((song) => song.local_stream);

  useEffect(() => {
    console.log("[RadioPlayer] runtime config", {
      forceDropTestMode: FORCE_DROP_TEST_MODE,
      narrationTransitionProbability: NARRATION_TRANSITION_PROBABILITY,
      postTransitionDelayMs: DROP_TO_TRACK_DELAY_MS,
    });
  }, []);

  useEffect(() => {
    const persisted = getInitialSelectedVibe();
    const vibeTimer =
      persisted !== "all"
        ? window.setTimeout(() => setSelectedVibe(persisted), 0)
        : null;

    const timer = window.setTimeout(() => {
      const initialDropInterval = getRandomDropInterval();
      songsUntilDropRef.current = initialDropInterval;
      setSongsUntilDrop(initialDropInterval);
      setTracksToday(getInitialTracksTodayCount());
      pendingRestoreStateRef.current = getPersistedRadioPlayerState();
    }, 0);

    return () => {
      if (vibeTimer !== null) {
        window.clearTimeout(vibeTimer);
      }
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!currentSong && !isDropPlaying) {
      return;
    }

    try {
      window.localStorage.setItem(
        RADIO_PLAYER_STATE_STORAGE_KEY,
        JSON.stringify({
          songId: currentSong?.id ?? null,
          selectedVibe,
          currentTime,
          shouldPlay,
        } satisfies PersistedRadioPlayerState),
      );
    } catch {
      // Ignore persistence write failures.
    }
  }, [currentSong, currentTime, isDropPlaying, selectedVibe, shouldPlay]);

  useEffect(() => {
    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      clearTransitionAudioStopTimer(transitionAudioStopTimerRef);
    };
  }, []);

  useEffect(() => {
    if (sharedAnalyserRef.current) {
      setVisualizerAnalyser(sharedAnalyserRef.current);
    }
  }, [isAudioReady, sharedAnalyserRef]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setLiveListeners((current) => {
        const step = Math.floor(Math.random() * 121) - 60;
        return Math.min(
          LIVE_LISTENER_MAX,
          Math.max(LIVE_LISTENER_MIN, current + step),
        );
      });
    }, LIVE_LISTENER_UPDATE_MS);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!currentSong?.id || isDropPlaying || countedTrackIdRef.current === currentSong.id) {
      return;
    }

    countedTrackIdRef.current = currentSong.id;
    setTracksToday((current) => {
      const nextCount = current + 1;

      try {
        window.localStorage.setItem(
          TRACKS_TODAY_STORAGE_KEY,
          JSON.stringify({
            date: new Date().toISOString().slice(0, 10),
            count: nextCount,
          }),
        );
      } catch {
        // Ignore local storage write failures and keep the in-memory counter.
      }

      return nextCount;
    });
  }, [currentSong?.id, isDropPlaying]);

  useEffect(() => {
    songsUntilDropRef.current = songsUntilDrop;
  }, [songsUntilDrop]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) {
      return;
    }

    let frameId = 0;
    let isPageVisible = !document.hidden;

    const setIdleGlow = () => {
      section.style.setProperty("--radio-glow-a", "0.12");
      section.style.setProperty("--radio-glow-b", "0.14");
      section.style.setProperty("--radio-glow-c", "0.10");
      section.style.setProperty("--radio-glow-scale", "1");
      section.style.setProperty("--radio-ambient-x", "0px");
      section.style.setProperty("--radio-ambient-y", "0px");
      section.style.setProperty("--radio-ambient-scale", "1.08");
      section.style.setProperty("--radio-ambient-rotate", "0deg");
      section.style.setProperty("--radio-ambient-opacity", "0");
    };

    const tick = () => {
      if (!isPageVisible) {
        return;
      }

      const activeAudio = isDropPlaying ? dropAudioRef.current : audioRef.current;
      const time = activeAudio?.currentTime ?? 0;
      const ambientX = Math.sin(time * 0.14) * 18;
      const ambientY = Math.cos(time * 0.11) * 14;
      const ambientScale = 1.08 + ((Math.sin(time * 0.08) + 1) / 2) * 0.08;
      const ambientRotate = Math.sin(time * 0.06) * 1.4;
      const pulseA = 0.12 + ((Math.sin(time * 2.2) + 1) / 2) * 0.08;
      const pulseB = 0.14 + ((Math.sin(time * 1.5 + 0.8) + 1) / 2) * 0.08;
      const pulseC = 0.1 + ((Math.sin(time * 2.8 + 1.4) + 1) / 2) * 0.06;
      const scale = 1 + ((Math.sin(time * 1.8) + 1) / 2) * 0.035;

      section.style.setProperty("--radio-glow-a", pulseA.toFixed(3));
      section.style.setProperty("--radio-glow-b", pulseB.toFixed(3));
      section.style.setProperty("--radio-glow-c", pulseC.toFixed(3));
      section.style.setProperty("--radio-glow-scale", scale.toFixed(3));
      section.style.setProperty("--radio-ambient-x", `${ambientX.toFixed(1)}px`);
      section.style.setProperty("--radio-ambient-y", `${ambientY.toFixed(1)}px`);
      section.style.setProperty("--radio-ambient-scale", ambientScale.toFixed(3));
      section.style.setProperty("--radio-ambient-rotate", `${ambientRotate.toFixed(2)}deg`);
      section.style.setProperty("--radio-ambient-opacity", ambientCoverActive ? "0.28" : "0");

      frameId = window.requestAnimationFrame(tick);
    };

    const onVisibilityChange = () => {
      isPageVisible = !document.hidden;
      if (!isPageVisible) {
        if (frameId) {
          window.cancelAnimationFrame(frameId);
          frameId = 0;
        }
        return;
      }

      if (isPlaying && ambientCoverActive && !frameId) {
        tick();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    if (isPlaying && ambientCoverActive) {
      tick();
    } else {
      setIdleGlow();
    }

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
      setIdleGlow();
    };
  }, [ambientCoverActive, audioRef, isPlaying, isDropPlaying]);


  useEffect(() => {
    let isMounted = true;

    async function loadQueueForVibe() {
      setIsLoading(true);

      try {
        const nextQueue =
          selectedVibe === "all"
            ? await getQueue()
            : await getQueue(selectedVibe);

        if (!isMounted) {
          return;
        }

        resetAudioElement(dropAudioRef.current);
        resetAudioElement(transitionBedAudioRef.current);

        const reorderedQueue = moveSongAwayFromFront(
          nextQueue,
          previousSongIdRef.current,
        );
        const persistedState = pendingRestoreStateRef.current;
        const restoredIndex =
          persistedState?.songId
            ? reorderedQueue.findIndex((song) => song.id === persistedState.songId)
            : -1;

        setQueue(reorderedQueue);
        setCurrentIndex(restoredIndex >= 0 ? restoredIndex : 0);
        setCurrentTime(restoredIndex >= 0 ? persistedState?.currentTime ?? 0 : 0);
        setDuration(0);
        setShouldPlay(
          restoredIndex >= 0
            ? (persistedState?.shouldPlay ?? (nextQueue.length > 0))
            : nextQueue.length > 0,
        );
        setError(nextQueue.length === 0 ? "No songs are available in this vibe queue yet." : "");
        setIsDropPlaying(false);
        setActiveDropLabel("");
        setPreparedEvent(null);
        pendingTrackIndexRef.current = null;
        pendingRestoreStateRef.current = restoredIndex >= 0 ? persistedState : null;
        recentDropIdsRef.current = [];
        recentBedIdsRef.current = [];
        songsUntilDropRef.current = getRandomDropInterval();
        setSongsUntilDrop(songsUntilDropRef.current);
      } catch {
        if (!isMounted) {
          return;
        }

        setQueue([]);
        setCurrentIndex(0);
        setShouldPlay(false);
        setError(RADIO_BACKEND_ERROR);
        setIsDropPlaying(false);
        setActiveDropLabel("");
        setPreparedEvent(null);
        pendingTrackIndexRef.current = null;
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadQueueForVibe();

    return () => {
      isMounted = false;
    };
  }, [currentUserTier, selectedVibe]);

  const songParamHandled = useRef(false);


  useEffect(() => {
    previousSongIdRef.current = currentSong?.id;
  }, [currentSong?.id]);

  useEffect(() => {
    isDropPlayingRef.current = isDropPlaying;
  }, [isDropPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      currentTrackIdRef.current = null;
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!currentSong) {
      setCurrentTrack(null);
      return;
    }

    setCurrentTrack({
      id: currentSong.id,
      src: getPreferredPlaybackUrl(currentSong, audioRef.current),
      title: currentSong.title,
      artist: currentSong.artist,
    });
  }, [audioRef, currentSong, setCurrentTrack]);

  function buildTransitionPlan(nextSong?: Song | null, nextVibe?: string) {
    const plan = getTransitionPlan({
      currentVibe: currentSong?.vibe ?? selectedVibe,
      nextVibe: nextVibe ?? nextSong?.vibe ?? selectedVibe,
      currentSong,
      nextSong,
      previousTransitionType: previousTransitionTypeRef.current,
    });

    previousTransitionTypeRef.current = plan.transitionType;
    setCurrentTransitionPlan(plan);
    return plan;
  }

  function getTransitionCopyCacheKey(prepared: PreparedStationEvent) {
    return [
      prepared.forSongId,
      prepared.nextSong.id,
      prepared.plan.transitionType,
      activeDJ.hostId,
    ].join(":");
  }

  function applyAiDjLine(
    prepared: PreparedStationEvent,
    djLine: string,
    requestToken: number,
  ) {
    if (!djLine || transitionCopyTokenRef.current !== requestToken) {
      return;
    }

    setCurrentTransitionPlan((current) =>
      current && current.transitionType === prepared.plan.transitionType
        ? { ...current, djLine, djLineSource: "ai" }
        : current,
    );

    setPreparedEvent((current) =>
      current &&
      current.forSongId === prepared.forSongId &&
      current.nextIndex === prepared.nextIndex
        ? {
            ...current,
            plan: { ...current.plan, djLine, djLineSource: "ai" },
          }
        : current,
    );
  }

  async function enhanceTransitionCopyWithAi(prepared: PreparedStationEvent) {
    const requestToken = transitionCopyTokenRef.current + 1;
    transitionCopyTokenRef.current = requestToken;

    const cacheKey = getTransitionCopyCacheKey(prepared);
    const cachedLine = transitionCopyCacheRef.current.get(cacheKey);
    if (cachedLine) {
      applyAiDjLine(prepared, cachedLine, requestToken);
      return;
    }

    try {
      const response = await fetch("/api/radio/transition-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentSongTitle: currentSong?.title ?? "",
          currentSongArtist: currentSong?.artist ?? "",
          currentSongVibe: currentSong?.vibe ?? selectedVibe,
          nextSongTitle: prepared.nextSong.title,
          nextSongArtist: prepared.nextSong.artist,
          nextSongVibe: prepared.nextSong.vibe ?? selectedVibe,
          hostName: activeDJ.displayName,
          hostTone: activeDJ.tone,
          transitionType: prepared.plan.transitionType,
          timeOfDay: selectedVibe === "late_night" ? "late night" : "day",
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        djLine?: string;
      };

      if (!response.ok || !payload.djLine?.trim()) {
        return;
      }

      const djLine = payload.djLine.trim();
      transitionCopyCacheRef.current.set(cacheKey, djLine);
      applyAiDjLine(prepared, djLine, requestToken);
    } catch {
      // keep static fallback copy
    }
  }

  function prepareStationEvent(nextIndex: number, nextVibe?: string) {
    const nextSong = queue[nextIndex];
    if (!currentSong || !nextSong) {
      return null;
    }

    const plan = buildTransitionPlan(nextSong, nextVibe ?? nextSong.vibe ?? selectedVibe);
    const shouldUseDrop =
      songsUntilDropRef.current === 1 && DJ_DROPS.length > 0 && plan.useDrop;
    const scheduledDrop = shouldUseDrop
      ? getPlannedDrop(selectedVibe, recentDropIdsRef.current, plan)
      : {
          drop: null,
          settings: { volume: 0.82, playbackRate: 1 },
        };
    let plannedDrop = scheduledDrop;
    const plannedNarration = getNarrationEventForVibe(
      nextVibe ?? nextSong.vibe ?? selectedVibe,
      plan,
    );
    const plannedBed = getTransitionBedForVibe(
      nextVibe ?? nextSong.vibe ?? selectedVibe,
      recentBedIdsRef.current,
    );
    const narrationHasAudio = Boolean(plannedNarration.clipSrc?.trim());
    console.log("[RadioPlayer] narration audio resolved", {
      vibe: plannedNarration.vibe,
      clipSrc: plannedNarration.clipSrc || null,
    });
    const narrationRequested =
      !FORCE_DROP_TEST_MODE &&
      scheduledDrop.drop &&
      narrationHasAudio &&
      shouldUseNarrationTransition();
    let transitionAudioMode: PreparedStationEvent["transitionAudioMode"];
    let usedFallback = false;

    if (FORCE_DROP_TEST_MODE) {
      transitionAudioMode = "drop";
    } else if (!narrationHasAudio) {
      if (!plannedDrop.drop) {
        const fallbackDrop = getPlannedDrop(
          selectedVibe,
          recentDropIdsRef.current,
          plan,
        );

        if (fallbackDrop.drop) {
          plannedDrop = fallbackDrop;
          usedFallback = true;
        }
      }

      if (plannedDrop.drop) {
        console.log("[RadioPlayer] narration missing audio -> fallback to drop", {
          narrationId: plannedNarration.id,
          vibe: plannedNarration.vibe,
          dropId: plannedDrop.drop.id,
          usedFallback,
        });
        transitionAudioMode = "drop";
      } else {
        transitionAudioMode = "direct";
      }
    } else if (narrationRequested) {
      transitionAudioMode = "narration";
    } else if (scheduledDrop.drop) {
      transitionAudioMode = "drop";
    } else if (narrationHasAudio) {
      transitionAudioMode = "narration";
    } else {
      transitionAudioMode = "direct";
    }

    const prepared: PreparedStationEvent = {
      forSongId: currentSong.id,
      nextIndex,
      nextSong,
      plan,
      plannedDrop,
      plannedNarration,
      plannedBed,
      transitionAudioMode,
    };
    const transitionSource = getTransitionSource(prepared.transitionAudioMode);

    console.log("[RadioPlayer] selected narration candidate", prepared.plannedNarration);
    console.log("[RadioPlayer] selected host/vibe", {
      voice: prepared.plannedNarration.voice,
      vibe: prepared.plannedNarration.vibe,
      transitionAudioMode: prepared.transitionAudioMode,
      narrationFallback: prepared.plannedNarration.usedFallback,
    });
    console.log("[RadioPlayer] runtime config", {
      forceDropTestMode: FORCE_DROP_TEST_MODE,
      selectedTransitionMode: prepared.transitionAudioMode,
      narrationHasAudio,
    });
    console.log("[RadioPlayer] transition source resolved", {
      source: transitionSource,
    });
    console.log("[RadioPlayer] transition type used", {
      transitionAudioMode: prepared.transitionAudioMode,
      forced: transitionSource === "forced",
    });
    console.log("[RadioPlayer] transition decision final", {
      source: prepared.transitionAudioMode,
      vibe: nextVibe ?? nextSong.vibe ?? selectedVibe,
      narrationHasAudio,
      usedFallback,
    });
    console.log("[RadioPlayer] transition bed prepared", {
      vibe: nextVibe ?? nextSong.vibe ?? selectedVibe,
      bedId: plannedBed?.id ?? null,
      bedSrc: plannedBed?.src ?? null,
      usedFallback: plannedBed?.usedFallback ?? false,
    });

    nextTrackPreloadRef.current = null;
    nextDropPreloadRef.current = null;
    nextBedPreloadRef.current = null;
    prepareBedAudio(transitionBedAudioRef.current, null);

    setPreparedEvent(prepared);
    void enhanceTransitionCopyWithAi(prepared);
    return prepared;
  }

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement || !currentSong || isDropPlaying) {
      if (isDropPlaying) {
        console.log("[RadioPlayer] blocked track load during drop", {
          songId: currentSong?.id ?? null,
        });
      }
      return;
    }

    if (!canUserTierAccessTrack(currentSong, currentUserTier)) {
      audioElement.pause();
      return;
    }

    const mediaElement = audioElement;
    hlsRef.current?.destroy();
    hlsRef.current = null;
    const hlsUrl = getHlsUrl(currentSong);
    const preferredUrl = getPreferredPlaybackUrl(currentSong, mediaElement);
    const trackToPlay = {
      id: currentSong.id,
      src: preferredUrl,
      title: currentSong.title,
      artist: currentSong.artist,
    };
    const startResolvedTrack = (resolvedSrc: string) => {
      if (!shouldPlay) {
        return;
      }

      if (requestedTrackStartIdRef.current !== trackToPlay.id) {
        return;
      }

      if (currentTrackIdRef.current === trackToPlay.id) {
        return;
      }

      currentTrackIdRef.current = trackToPlay.id;
      requestedTrackStartIdRef.current = null;

      if (process.env.NODE_ENV === "development") {
        console.log("track start:", trackToPlay.id);
      }

      void playTrack(audioRef, {
        ...trackToPlay,
        src: resolvedSrc,
      });
    };
    const sourceKey =
      hlsUrl && !canUseNativeHls(mediaElement)
        ? hlsUrl
        : preferredUrl;

    if (hlsUrl && canUseNativeHls(mediaElement)) {
      if ((mediaElement.currentSrc || mediaElement.src).includes(hlsUrl)) {
        activeTrackSourceKeyRef.current = sourceKey;
        startResolvedTrack(hlsUrl);
        return;
      }

      activeTrackSourceKeyRef.current = sourceKey;
      isPlayingRef.current = false;
      mediaElement.src = hlsUrl;
      mediaElement.load();
      startResolvedTrack(hlsUrl);
      return;
    }

    let cancelled = false;

    async function loadTrackSource() {
      if (activeTrackSourceKeyRef.current === sourceKey) {
        return;
      }

      if (hlsUrl) {
        const hlsModule = await loadHlsModule();
        const HlsCtor = hlsModule.default;

        if (!cancelled && HlsCtor.isSupported()) {
          activeTrackSourceKeyRef.current = sourceKey;
          isPlayingRef.current = false;
          const hls = new HlsCtor({
            enableWorker: true,
            lowLatencyMode: false,
          });

          hlsRef.current = hls;
          hls.attachMedia(mediaElement);
          hls.on(HlsCtor.Events.MEDIA_ATTACHED, () => {
            hls.loadSource(hlsUrl);
          });
          hls.on(HlsCtor.Events.MANIFEST_PARSED, () => {
            startResolvedTrack(mediaElement.currentSrc || mediaElement.src || hlsUrl);
          });
          hls.on(HlsCtor.Events.ERROR, (_event, data) => {
            if (!data.fatal) {
              return;
            }

            console.error("[RadioPlayer] hls fatal error", data);
            hls.destroy();
            hlsRef.current = null;
            mediaElement.src = preferredUrl;
            mediaElement.load();
          });
          return;
        }
      }

      if (!cancelled) {
        if ((mediaElement.currentSrc || mediaElement.src).includes(preferredUrl)) {
          activeTrackSourceKeyRef.current = sourceKey;
          startResolvedTrack(preferredUrl);
          return;
        }

        activeTrackSourceKeyRef.current = sourceKey;
        isPlayingRef.current = false;
        mediaElement.src = preferredUrl;
        mediaElement.load();
        startResolvedTrack(preferredUrl);
      }
    }

    void loadTrackSource();

    return () => {
      cancelled = true;
    };
  }, [audioRef, currentSong, currentUserTier, isDropPlaying, shouldPlay]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!isAudioReady || !audio) {
      return;
    }

    audio.onended = null;
    audio.onerror = null;
    audio.onloadedmetadata = null;
    audio.onpause = null;
    audio.onplay = null;
    audio.ontimeupdate = null;

    audio.onended = () => {
      isPlayingRef.current = false;
      if (transitionInFlightRef.current || isDropPlayingRef.current || isSkippingRef.current) {
        return;
      }
      void skipToNextTrackRef.current();
    };

    audio.onerror = () => {
      setError(RADIO_BACKEND_ERROR);
      setShouldPlay(false);
      setIsPlaying(false);
      isPlayingRef.current = false;
    };

    audio.onloadedmetadata = () => handleLoadedMetadataRef.current();
    audio.onpause = () => {
      setIsPlaying(false);
      isPlayingRef.current = false;
    };
    audio.onplay = () => {
      setIsPlaying(true);
      isPlayingRef.current = true;
    };
    audio.ontimeupdate = () => handleTimeUpdateRef.current();

    return () => {
      audio.onended = null;
      audio.onerror = null;
      audio.onloadedmetadata = null;
      audio.onpause = null;
      audio.onplay = null;
      audio.ontimeupdate = null;
    };
  }, [audioRef, isAudioReady]);

  function moveToTrack(index: number) {
    console.log("[RadioPlayer] moveToTrack", {
      index,
      isDropPlaying,
    });
    const outgoingSong = queue[currentIndex];

    if (outgoingSong) {
      setRecentlyPlayed((current) => {
        if (current[0]?.id === outgoingSong.id) {
          return current;
        }

        return [
          {
            id: outgoingSong.id,
            title: outgoingSong.title,
            artist: outgoingSong.artist,
            vibe: outgoingSong.vibe,
            coverUrl: getCoverUrl(outgoingSong),
          },
          ...current.filter((song) => song.id !== outgoingSong.id),
        ].slice(0, 4);
      });
    }

    setCurrentIndex(index);
    setCurrentTime(0);
    setDuration(queue[index]?.duration_sec ?? 0);
    setPreparedEvent(null);
    setShouldPlay(true);
    requestedTrackStartIdRef.current = queue[index]?.id ?? null;
    currentTrackIdRef.current = null;
    transitionInFlightRef.current = false;
    isPlayingRef.current = false;
  }

  function finishTransitionAndStartTrack(reason: "ended" | "error") {
    const pendingTrackIndex = pendingTrackIndexRef.current;
    const dropAudio = dropAudioRef.current;
    const transitionType = transitionAudioModeRef.current ?? "drop";

    clearTransitionAudioStopTimer(transitionAudioStopTimerRef);
    dropPlaybackTokenRef.current += 1;
    transitionAudioModeRef.current = null;

    if (audioRef.current) {
      audioRef.current.volume = 1;
    }

    console.log(`[RadioPlayer] ${transitionType} finished`, {
      reason,
      pendingTrackIndex,
      activeDropLabel,
      currentTime: dropAudio?.currentTime ?? null,
      duration:
        dropAudio && Number.isFinite(dropAudio.duration) ? dropAudio.duration : null,
    });

    pendingTrackIndexRef.current = null;
    setIsDropPlaying(false);
    setActiveDropLabel("");
    resetAudioElement(dropAudioRef.current);
    const bedAudio = transitionBedAudioRef.current;
    if (transitionType === "narration" && bedAudio && !bedAudio.paused) {
      void fadeAudioOut(bedAudio, { durationMs: 180, steps: 6 }).catch(() => {
        resetAudioElement(bedAudio);
      });
    } else {
      resetAudioElement(bedAudio);
    }

    if (pendingTrackIndex !== null) {
      console.log("[RadioPlayer] post-drop delay", {
        delayMs: DROP_TO_TRACK_DELAY_MS,
        resumeTrackIndex: pendingTrackIndex,
      });
      window.setTimeout(() => {
        console.log("[RadioPlayer] track resume timing", {
          resumedAt: window.performance.now(),
          trackIndex: pendingTrackIndex,
          transitionType,
        });
        moveToTrack(pendingTrackIndex);
      }, DROP_TO_TRACK_DELAY_MS);
      return;
    }

    transitionInFlightRef.current = false;
  }

  async function playSimpleDjDropBeforeTrack(nextIndex: number) {
    const transitionAudio = dropAudioRef.current;

    if (!ENABLE_DJ_DROPS || !transitionAudio) {
      moveToTrack(nextIndex);
      return;
    }

    const playbackToken = dropPlaybackTokenRef.current + 1;
    dropPlaybackTokenRef.current = playbackToken;
    transitionAudioModeRef.current = "drop";
    pendingTrackIndexRef.current = nextIndex;
    setActiveDropLabel("FlowSoundz Radio");
    setIsDropPlaying(true);
    setShouldPlay(false);
    setCurrentTime(0);
    setDuration(0);

    if (audioRef.current) {
      audioRef.current.volume = 0;
      audioRef.current.pause();
    }

    clearTransitionAudioStopTimer(transitionAudioStopTimerRef);
    finishTransitionAndStartTrack("ended");
  }

  async function playTransitionAudioBeforeTrack({
    mode,
    src,
    label,
    volume,
    playbackRate,
    nextIndex,
  }: {
    mode: "drop" | "narration";
    src: string;
    label: string;
    volume: number;
    playbackRate: number;
    nextIndex: number;
  }) {
    const transitionAudio = dropAudioRef.current;
    const playbackToken = dropPlaybackTokenRef.current + 1;

    if (!transitionAudio) {
      moveToTrack(nextIndex);
      return;
    }

    dropPlaybackTokenRef.current = playbackToken;
    transitionAudioModeRef.current = mode;
    pendingTrackIndexRef.current = nextIndex;
    setActiveDropLabel(label);
    setIsDropPlaying(true);
    setShouldPlay(false);
    setCurrentTime(0);
    setDuration(0);

    if (audioRef.current) {
      audioRef.current.volume = 0;
      audioRef.current.pause();
    }

    clearTransitionAudioStopTimer(transitionAudioStopTimerRef);
    void volume;
    void playbackRate;
    console.log(`[RadioPlayer] ${mode} transition bypassed`, {
      nextIndex,
      src,
      playbackToken,
      reason: "global_single_playback_engine",
    });
    finishTransitionAndStartTrack("ended");
  }

  async function playNarrationBed(src: string, nextIndex: number) {
    const bedAudio = transitionBedAudioRef.current;

    if (!bedAudio) {
      return;
    }

    if (!src || !isTransitionBedSrc(src)) {
      console.warn("[RadioPlayer] narration bed skipped due to invalid src", {
        nextIndex,
        src,
      });
      resetAudioElement(bedAudio);
      return;
    }

    console.log("[RadioPlayer] narration bed bypassed", {
      nextIndex,
      src,
      reason: "global_single_playback_engine",
    });
    resetAudioElement(bedAudio);
  }

  async function playDjDropBeforeTrack(
    nextIndex: number,
    prepared?: PreparedStationEvent | null,
  ) {
    const transitionAudio = dropAudioRef.current;
    const dropVibe = prepared?.nextSong.vibe ?? selectedVibe;
    const forcedDropSelection = FORCE_DROP_TEST_MODE
      ? getForcedTestDropCandidate(dropVibe, recentDropIdsRef.current)
      : null;
    const plannedDrop =
      prepared?.plannedDrop ??
      getPlannedDrop(selectedVibe, recentDropIdsRef.current, prepared?.plan);
    const drop = forcedDropSelection?.drop ?? plannedDrop.drop;
    const transitionSource = FORCE_DROP_TEST_MODE ? "forced" : "drop";
    const dropVolume = FORCE_DROP_TEST_MODE
      ? FORCED_DROP_TEST_VOLUME
      : Math.min(plannedDrop.settings.volume + 0.12, 1);
    const dropSrc = drop ? getDropPlaybackSrc(drop) : null;
    const dropLabel = drop?.label ?? "";

    console.log("[RadioPlayer] selected drop candidate", {
      vibe: dropVibe,
      dropId: drop?.id ?? null,
      dropLabel,
      forced: transitionSource === "forced",
      usedFallback: forcedDropSelection?.usedFallback ?? false,
    });

    console.log("[RadioPlayer] selecting drop path", {
      nextIndex,
      isForcedDrop: transitionSource === "forced",
      dropSrc,
      dropVolume,
      plannedDropId: drop?.id ?? null,
      narration: prepared?.plannedNarration ?? null,
      transitionAudioMode: prepared?.transitionAudioMode ?? "drop",
      dropFallback: forcedDropSelection?.usedFallback ?? false,
    });

    if (!transitionAudio || !dropSrc) {
      console.log("[RadioPlayer] drop unavailable, moving directly to track", {
        nextIndex,
        hasDropAudio: Boolean(transitionAudio),
        dropSrc,
      });
      moveToTrack(nextIndex);
      return;
    }

    if (drop) {
      recentDropIdsRef.current = [drop.id, ...recentDropIdsRef.current].slice(
        0,
        MAX_RECENT_DROP_HISTORY,
      );
    }

    await playTransitionAudioBeforeTrack({
      mode: "drop",
      src: dropSrc,
      label: dropLabel,
      volume: dropVolume,
      playbackRate: plannedDrop.settings.playbackRate,
      nextIndex,
    });
  }

  async function playNarrationBeforeTrack(
    nextIndex: number,
    prepared?: PreparedStationEvent | null,
  ) {
    const narration = prepared?.plannedNarration;
    const plannedBed = prepared?.plannedBed;

    if (!narration?.clipSrc) {
      moveToTrack(nextIndex);
      return;
    }

    console.log("[RadioPlayer] narration candidate selected for playback", {
      narrationId: narration.id,
      label: narration.label,
      vibe: narration.vibe,
      usedFallback: narration.usedFallback,
      bedId: prepared?.plannedBed?.id ?? null,
      bedSrc: prepared?.plannedBed?.src ?? null,
    });
    if (prepared?.plannedBed) {
      recentBedIdsRef.current = [prepared.plannedBed.id, ...recentBedIdsRef.current].slice(
        0,
        MAX_RECENT_BED_HISTORY,
      );
    }
    if (plannedBed?.src) {
      await playNarrationBed(plannedBed.src, nextIndex);
    } else {
      resetAudioElement(transitionBedAudioRef.current);
    }

    await playTransitionAudioBeforeTrack({
      mode: "narration",
      src: narration.clipSrc,
      label: narration.label,
      volume: 0.96,
      playbackRate: 1,
      nextIndex,
    });
  }

  function executeStationEvent(prepared?: PreparedStationEvent | null) {
    const nextIndex = prepared?.nextIndex ?? getNextTrackIndex(queue, currentIndex);

    if (prepared?.transitionAudioMode === "narration") {
      console.log("[RadioPlayer] routing through narration", {
        nextIndex,
        narrationId: prepared.plannedNarration.id,
      });
      songsUntilDropRef.current = getRandomDropInterval();
      setSongsUntilDrop(songsUntilDropRef.current);
      void playNarrationBeforeTrack(nextIndex, prepared);
      return;
    }

    if (prepared?.transitionAudioMode === "drop") {
      console.log("[RadioPlayer] routing through DJ drop", {
        nextIndex,
        forced: false,
        plannedDropId: prepared?.plannedDrop.drop?.id ?? null,
      });
      songsUntilDropRef.current = getRandomDropInterval();
      setSongsUntilDrop(songsUntilDropRef.current);
      void playDjDropBeforeTrack(nextIndex, prepared);
      return;
    }

    songsUntilDropRef.current =
      songsUntilDropRef.current === 1
        ? getRandomDropInterval()
        : Math.max(songsUntilDropRef.current - 1, 1);
    setSongsUntilDrop(songsUntilDropRef.current);
    moveToTrack(nextIndex);
  }

  async function queueTransitionToNextTrack(reason: "auto" | "skip") {
    if (queue.length === 0 || transitionInFlightRef.current || isDropPlaying) {
      return;
    }

    transitionInFlightRef.current = true;

    const nextIndex = getNextTrackIndex(queue, currentIndex);
    const nextPrepared =
      preparedEvent?.forSongId === currentSong?.id
        ? preparedEvent
        : prepareStationEvent(nextIndex, queue[nextIndex]?.vibe ?? selectedVibe);
    const audio = audioRef.current;
    const fadeDurationMs = Math.min(
      600,
      Math.max(400, nextPrepared?.plan.durationMs ?? FADE_DURATION_MS),
    );

    console.log("[RadioPlayer] queue transition", {
      reason,
      nextIndex,
      fadeDurationMs,
      enableDjDrops: ENABLE_DJ_DROPS,
    });

    try {
      if (audio && !audio.paused) {
        await fadeOutAudio(audio, fadeDurationMs);
      }

      if (ENABLE_DJ_DROPS) {
        songsUntilDropRef.current = getRandomDropInterval();
        setSongsUntilDrop(songsUntilDropRef.current);
        await playSimpleDjDropBeforeTrack(nextIndex);
        return;
      }

      executeStationEvent(nextPrepared);
    } finally {
      if (!ENABLE_DJ_DROPS) {
        transitionInFlightRef.current = false;
      }
    }
  }

  async function skipToNextTrack() {
    if (isSkippingRef.current) return;

    isSkippingRef.current = true;

    try {
      await queueTransitionToNextTrack("skip");
    } finally {
      window.setTimeout(() => {
        isSkippingRef.current = false;
      }, 300);
    }
  }

  async function handleVibeSelect(vibe: string) {
    if (vibe === selectedVibe) {
      return;
    }

    const audio = audioRef.current;
    const dropAudio = dropAudioRef.current;
    const plan = buildTransitionPlan(queue[currentIndex + 1] ?? null, vibe);

    if (audio) {
      await fadeOutAudio(audio, plan.durationMs);
    }

    clearTransitionAudioStopTimer(transitionAudioStopTimerRef);
    resetAudioElement(dropAudio);
    resetAudioElement(transitionBedAudioRef.current);

    pendingTrackIndexRef.current = null;
    transitionAudioModeRef.current = null;
    transitionInFlightRef.current = false;
    setIsDropPlaying(false);
    setActiveDropLabel("");
    setPreparedEvent(null);
    setSelectedVibe(vibe);
  }

  function togglePlayback() {
    const activeAudio = isDropPlaying ? dropAudioRef.current : audioRef.current;

    if (!activeAudio || (!currentSong && !isDropPlaying)) {
      return;
    }

    if (isPlaying) {
      activeAudio.pause();
      setShouldPlay(false);
      return;
    }

    if (currentSong) {
      requestedTrackStartIdRef.current = currentSong.id;
      currentTrackIdRef.current = null;
      setShouldPlay(true);
    }
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    setCurrentTime(audio.currentTime);
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration);

      if (
        currentSong &&
        !isDropPlaying &&
        audio.duration - audio.currentTime <= 10 &&
        (!preparedEvent || preparedEvent.forSongId !== currentSong.id) &&
        queue.length > 1
      ) {
        const nextIndex = getNextTrackIndex(queue, currentIndex);
        prepareStationEvent(nextIndex, queue[nextIndex]?.vibe ?? selectedVibe);
      }

      if (
        currentSong &&
        !isDropPlaying &&
        !transitionInFlightRef.current &&
        queue.length > 0 &&
        audio.duration - audio.currentTime <=
          (FADE_DURATION_MS + AUTO_NEXT_FADE_BUFFER_MS) / 1000
      ) {
        void queueTransitionToNextTrack("auto");
      }
    }
  }

  function handleLoadedMetadata() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const pendingRestore = pendingRestoreStateRef.current;
    if (
      pendingRestore &&
      currentSong?.id === pendingRestore.songId &&
      pendingRestore.currentTime > 0 &&
      Number.isFinite(audio.duration) &&
      audio.duration > 0
    ) {
      audio.currentTime = Math.min(
        pendingRestore.currentTime,
        Math.max(audio.duration - 0.25, 0),
      );
      setCurrentTime(audio.currentTime);
      pendingRestoreStateRef.current = null;
    }

    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration);
    }
  }

  useEffect(() => {
    skipToNextTrackRef.current = skipToNextTrack;
    handleTimeUpdateRef.current = handleTimeUpdate;
    handleLoadedMetadataRef.current = handleLoadedMetadata;
  });

  useEffect(() => {
    togglePlaybackRef.current = togglePlayback;
    skipTrackRef.current = skipToNextTrack;

    return () => {
      if (togglePlaybackRef.current === togglePlayback) {
        togglePlaybackRef.current = null;
      }
      if (skipTrackRef.current === skipToNextTrack) {
        skipTrackRef.current = null;
      }
    };
  });

  useEffect(() => {
    if (songParamHandled.current || queue.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const songId = params.get("song");
    if (!songId) return;
    const idx = queue.findIndex((s) => s.id === songId);
    if (idx !== -1) {
      songParamHandled.current = true;
      window.setTimeout(() => {
        moveToTrack(idx);
      }, 0);
      window.history.replaceState(null, "", window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue]);

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0 || isDropPlaying) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
  }

  // Keyboard controls: Space = play/pause, ←/→ = seek ±10s, hold for continuous seek
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        togglePlayback();
      } else if (e.code === "ArrowRight" && !isDropPlaying) {
        e.preventDefault();
        if (e.repeat) {
          const audio = audioRef.current;
          if (audio && Number.isFinite(audio.duration)) {
            audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
          }
        } else {
          void skipToNextTrack();
        }
      } else if (e.code === "ArrowLeft" && !isDropPlaying) {
        e.preventDefault();
        const audio = audioRef.current;
        if (audio) {
          if (e.repeat) {
            audio.currentTime = Math.max(0, audio.currentTime - 5);
          } else {
            audio.currentTime = 0;
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentSong, isDropPlaying]);

  useEffect(() => {
    if (!currentSong) return;
    try {
      const data = {
        title: currentSong.title,
        artist: currentSong.artist,
        vibe: currentSong.vibe ?? "all",
        isPlaying,
        timestamp: Date.now(),
      };
      localStorage.setItem("flowsoundz-now-playing", JSON.stringify(data));
      const ch = new BroadcastChannel("flowsoundz-now-playing");
      ch.postMessage(data);
      ch.close();
    } catch {}
  }, [currentSong, isPlaying]);

  const upcomingSongs = currentSong
    ? Array.from({ length: Math.min(queue.length - 1, 6) }, (_, offset) => {
        return queue[(currentIndex + offset + 1) % queue.length];
      }).filter(Boolean)
    : [];

  if (!isFullView) {
    if (!currentSong) return null;
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    return (
      <div className="fixed bottom-[60px] left-0 right-0 z-40 border-t border-white/[0.07] bg-[#050816]/92 backdrop-blur-xl sm:bottom-[68px]">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2 sm:px-4">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
            <CoverArt src={getCoverUrl(currentSong)} alt={currentSong.title} sizes="40px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[#F8FAFC]">{currentSong.title}</p>
            <p className="truncate text-[10px] text-white/45">{currentSong.artist}</p>
            <div className="mt-1.5 h-[2px] overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#00E5FF] transition-[width] duration-200" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <button
            type="button"
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={() => setShouldPlay(!isPlaying)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white transition hover:bg-white/10"
          >
            {isPlaying ? (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            ) : (
              <svg className="h-4 w-4 translate-x-px" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
            )}
          </button>
          <Link
            href="/radio"
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[#00E5FF]/20 bg-[#00E5FF]/8 px-3 text-[11px] font-semibold text-[#00E5FF] transition hover:bg-[#00E5FF]/14"
          >
            Full
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="relative mx-auto flex min-h-screen w-full max-w-md lg:max-w-6xl flex-col px-4 lg:px-8 pb-28 pt-6 text-[#F8FAFC]"
      style={
        {
          "--radio-glow-a": 0.12,
          "--radio-glow-b": 0.14,
          "--radio-glow-c": 0.1,
          "--radio-glow-scale": 1,
          "--radio-ambient-x": "0px",
          "--radio-ambient-y": "0px",
          "--radio-ambient-scale": 1.08,
          "--radio-ambient-rotate": "0deg",
          "--radio-ambient-opacity": 0,
        } as CSSProperties
      }
    >
      <div
        className={`pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-700 ${
          ambientCoverActive ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className="absolute inset-[-14%]"
          style={{
            transform:
              "translate3d(var(--radio-ambient-x), var(--radio-ambient-y), 0) scale(var(--radio-ambient-scale)) rotate(var(--radio-ambient-rotate))",
            opacity: "var(--radio-ambient-opacity)",
          }}
        >
          <CoverArt
            src={currentCoverUrl}
            alt=""
            sizes="100vw"
            className="object-cover blur-3xl saturate-[1.18]"
          />
        </div>
        <div
          className="absolute inset-[-18%]"
          style={{
            transform:
              "translate3d(calc(var(--radio-ambient-x) * -0.45), calc(var(--radio-ambient-y) * -0.45), 0) scale(calc(var(--radio-ambient-scale) + 0.08))",
            opacity: "calc(var(--radio-ambient-opacity) * 0.58)",
          }}
        >
          <CoverArt
            src={currentCoverUrl}
            alt=""
            sizes="100vw"
            className="object-cover blur-[110px] saturate-150"
          />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.08),transparent_26%),radial-gradient(circle_at_22%_24%,rgba(0,229,255,0.12),transparent_30%),radial-gradient(circle_at_78%_24%,rgba(139,92,246,0.14),transparent_32%),linear-gradient(180deg,rgba(5,8,22,0.32)_0%,rgba(5,8,22,0.64)_46%,rgba(5,8,22,0.9)_100%)]" />
      </div>

      <div className="relative z-10 isolate">
        <div
          className="pointer-events-none absolute -left-12 top-12 h-40 w-40 rounded-full bg-[#00E5FF] blur-3xl"
          style={{
            opacity: "var(--radio-glow-a)",
            transform: "scale(var(--radio-glow-scale))",
          }}
        />
        <div
          className="pointer-events-none absolute right-0 top-36 h-44 w-44 rounded-full bg-[#8B5CF6] blur-3xl"
          style={{
            opacity: "var(--radio-glow-b)",
            transform: "scale(var(--radio-glow-scale))",
          }}
        />
        <div
          className="pointer-events-none absolute bottom-16 left-1/3 h-40 w-40 rounded-full bg-[#FF2DA6] blur-3xl"
          style={{
            opacity: "var(--radio-glow-c)",
            transform: "scale(var(--radio-glow-scale))",
          }}
        />

        <div className="mb-5">
          <div
            className="relative w-full overflow-hidden rounded-[1.8rem]"
            style={{ height: "clamp(220px, 28vw, 360px)" }}
          >
            <VisualizerCanvasThree
              isPlaying={isPlaying}
              className="absolute inset-0 h-full w-full"
            />
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <Image
                src="/FSRLogo.svg"
                alt="FlowSoundz Radio"
                width={260}
                height={84}
                priority
                className="viz-logo h-auto w-[clamp(180px,22vw,260px)]"
                style={{
                  filter:
                    "brightness(1.4) drop-shadow(0 0 18px rgba(0,230,255,0.45))",
                }}
              />
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-[1.8rem] shadow-[inset_0_0_60px_rgba(0,229,255,0.05),inset_0_0_28px_rgba(124,77,255,0.04)]" />
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-6">
        <div>
        <div className="glass-card relative overflow-hidden rounded-[2rem] border border-white/8 bg-[#0B1020]/82 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.42)]">
          <div className="rounded-[1.7rem] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(0,229,255,0.16),transparent_34%),radial-gradient(circle_at_top_right,rgba(255,45,166,0.14),transparent_30%),linear-gradient(135deg,#111827_0%,#0B1020_62%,#050816_100%)] p-5 shadow-[0_0_40px_rgba(0,229,255,0.06)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="live-badge inline-flex items-center gap-2 rounded-full border border-[#FF2DA6]/25 bg-[linear-gradient(90deg,rgba(255,45,166,0.16),rgba(139,92,246,0.16),rgba(0,229,255,0.12))] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#F8FAFC] shadow-[0_0_18px_rgba(255,45,166,0.1)]">
                  <span className="live-dot h-2.5 w-2.5 rounded-full bg-[#FF2DA6] shadow-[0_0_12px_rgba(255,45,166,0.75)]" />
                  Live Radio
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-[#CBD5E1]/70">
                  FlowSoundz Radio
                </p>
                <h1 className="mt-3 font-display text-3xl lg:text-4xl font-semibold text-[#F8FAFC]">
                  After Hours Station
                </h1>
                <p className="mt-2 max-w-xs lg:max-w-sm text-sm leading-6 text-[#CBD5E1]">
                  Neon late-night rotation with premium dark-club energy and
                  smooth mobile-first playback.
                </p>

                <div className="mt-3 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#00E5FF]/80">
                    Active Host: {activeDJ.displayName}
                  </p>
                  <p className="max-w-xs text-xs leading-5 text-[#CBD5E1]/80">
                    {activeDJ.narrationStyle}
                  </p>
                </div>

                {usingLocalCatalog ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#00E5FF]/18 bg-[#00E5FF]/10 px-3 py-1.5 text-[11px] font-medium text-[#A5F3FC]">
                    <span className="h-2 w-2 rounded-full bg-[#00E5FF] shadow-[0_0_10px_rgba(0,229,255,0.8)]" />
                    Local catalog fallback active
                  </div>
                ) : null}

                {activeDropLabel ? (
                  <p className="mt-3 text-xs font-medium uppercase tracking-[0.2em] text-[#00E5FF]/80">
                    DJ Drop: {activeDropLabel}
                  </p>
                ) : null}

                {currentBed ? (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#A5F3FC]/80">
                      Now Playing Bed: {currentBed.id}
                    </p>
                    <p className="text-xs text-[#CBD5E1]/75">
                      🎧 Background Vibe: {formatVibeLabel(currentBed.vibe)}
                    </p>
                  </div>
                ) : null}

                {currentTransitionPlan ? (
                  <div className="mt-3 rounded-[1rem] border border-white/8 bg-white/5 px-3 py-2 text-[11px] text-[#CBD5E1]/85">
                    <p className="uppercase tracking-[0.18em] text-[#CBD5E1]/55">
                      Transition brain
                    </p>
                    <p className="mt-1 font-medium text-[#F8FAFC]">
                      {currentTransitionPlan.transitionType}
                    </p>
                    <p className="mt-1 text-[#CBD5E1]">
                      {currentTransitionPlan.djLine}
                    </p>
                    <p className="mt-1 text-[#CBD5E1]/75">
                      {currentTransitionPlan.voice} · {currentTransitionPlan.fxLevel}
                    </p>
                    <p className="mt-1 text-[#CBD5E1]/60">
                      {currentTransitionPlan.useDrop ? "drop" : "direct"} ·{" "}
                      {currentTransitionPlan.dropReason}
                    </p>
                  </div>
                ) : null}

                {preparedEvent ? (
                  <div className="mt-3 rounded-[1rem] border border-[#00E5FF]/12 bg-[#00E5FF]/8 px-3 py-2 text-[11px] text-[#CBD5E1]/85">
                    <p className="uppercase tracking-[0.18em] text-[#CBD5E1]/55">
                      Up Next
                    </p>
                    <p className="mt-1 font-medium text-[#F8FAFC]">
                      {preparedEvent.nextSong.title}
                    </p>
                    <p className="mt-1 text-[#CBD5E1]">
                      {preparedEvent.nextSong.artist}
                    </p>
                    <p className="mt-1 text-[#CBD5E1]/75">
                      {preparedEvent.plan.transitionType} ·{" "}
                      {preparedEvent.plannedDrop.drop ? "drop coming" : "direct mix"}
                    </p>
                  </div>
                ) : null}
              </div>

              <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-medium text-[#CBD5E1]">
                {queue.length} queued
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.26em] text-[#CBD5E1]/55">
            Vibe
          </p>
          <div className="flex flex-wrap gap-3">
            {VIBE_OPTIONS.map((vibe) => {
              const isActive = vibe === selectedVibe;

              return (
                <button
                  key={vibe}
                  type="button"
                  onClick={() => void handleVibeSelect(vibe)}
                  className={`vibe-chip state-fade min-h-12 rounded-full px-5 text-sm font-semibold ${
                    isActive
                      ? "bg-[linear-gradient(90deg,#00E5FF_0%,#8B5CF6_55%,#FF2DA6_100%)] text-[#050816] shadow-[0_0_24px_rgba(139,92,246,0.22)]"
                      : "border border-white/8 bg-[#111827]/88 text-[#CBD5E1] hover:border-white/12 hover:bg-[#111827]"
                  }`}
                >
                  {formatVibeLabel(vibe)}
                </button>
              );
            })}
          </div>
          {/* Station stats */}
          <div className="mt-4 flex flex-wrap gap-3 sm:gap-5">
            <div className="flex min-w-0 items-center gap-2 rounded-full border border-white/8 bg-white/5 px-3 py-1.5">
              <svg className="h-3.5 w-3.5 text-[#00E5FF]/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
              <span className="text-[11px] text-[#CBD5E1]/40">Live Listeners</span>
              <span className="text-[11px] font-semibold text-[#CBD5E1]/65">
                {liveListeners.toLocaleString()}
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-2 rounded-full border border-white/8 bg-white/5 px-3 py-1.5">
              <svg className="h-3.5 w-3.5 text-[#8B5CF6]/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              <span className="text-[11px] text-[#CBD5E1]/40">Tracks Today</span>
              <span className="text-[11px] font-semibold text-[#CBD5E1]/65">
                {tracksToday.toLocaleString()}
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-2 rounded-full border border-white/8 bg-white/5 px-3 py-1.5">
              <svg className="h-3.5 w-3.5 text-[#FF2DA6]/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <span className="text-[11px] text-[#CBD5E1]/40">Current Vibe</span>
              <span className="text-[11px] font-semibold text-[#CBD5E1]/65">{formatVibeLabel(selectedVibe)}</span>
            </div>
          </div>
        </div>

        <div className="now-playing-card state-fade mt-5 rounded-[1.8rem] border border-white/12 bg-[linear-gradient(180deg,rgba(17,24,39,0.96)_0%,rgba(11,16,32,0.96)_75%,rgba(5,8,22,0.98)_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_24px_84px_rgba(0,0,0,0.42)]">
          <div className="grid items-start gap-5 sm:grid-cols-[156px_1fr] lg:grid-cols-[192px_1fr]">

            {/* Left column: album art + visualizer strip */}
            <div className="flex flex-col">
              <div className="relative rounded-[1.6rem] border border-white/10 bg-[#0B1020]/90 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_0_26px_rgba(139,92,246,0.08)]">
                <div className="pointer-events-none absolute inset-2 rounded-[1.25rem] bg-[radial-gradient(circle_at_50%_42%,rgba(139,92,246,0.18),transparent_42%),radial-gradient(circle_at_34%_72%,rgba(0,229,255,0.12),transparent_36%)] blur-2xl opacity-80" />
                <div className="relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(0,229,255,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,45,166,0.15),transparent_30%),linear-gradient(135deg,#111827_0%,#0B1020_58%,#050816_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_30px_rgba(139,92,246,0.12)]">
                  <div className="aspect-square">
                    {SHOW_COVER_ART && currentCoverUrl && !isDropPlaying ? (
                      <CoverArt
                        src={currentCoverUrl}
                        alt={`${currentSong?.title ?? "Station"} cover art`}
                        sizes="(min-width: 1024px) 192px, 156px"
                        className="state-fade object-cover"
                      />
                    ) : (
                      <div className="state-fade flex h-full flex-col justify-between p-4">
                        <div className="flex items-center justify-between">
                          <span className="rounded-full border border-white/8 bg-white/6 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#CBD5E1]">
                            On Air
                          </span>
                          <span className="text-xl text-[#F8FAFC]/75">♪</span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#00E5FF]/85">
                            FlowSoundz
                          </p>
                          <p className={`mt-2 line-clamp-2 text-lg font-semibold text-[#F8FAFC] ${currentSong || isDropPlaying ? "" : "waiting-copy"}`}>
                            {isDropPlaying ? "Station ident" : currentSong ? currentSong.title : waitingTitle}
                            {currentSong || isDropPlaying ? null : <span className="signal-dots">...</span>}
                          </p>
                          <p className={`mt-1 line-clamp-1 text-sm text-[#CBD5E1] ${currentSong || isDropPlaying ? "" : "waiting-copy"}`}>
                            {isDropPlaying ? activeDropLabel || "FlowSoundz Radio" : currentSong ? currentSong.artist : waitingArtist}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Visualizer strip — same width as album art, below it */}
              <button
                type="button"
                onClick={() => setShowVisualizer(true)}
                className="group mt-2 w-full rounded-[0.85rem] border border-white/[0.06] bg-white/[0.025] px-1.5 pb-1.5 pt-2 transition hover:border-[#00e5ff]/25 hover:bg-[#00e5ff]/[0.05]"
                title="Open visualizer"
              >
                <div className="relative h-8 w-full overflow-hidden rounded-[0.6rem]">
                  <svg
                    viewBox="0 0 200 32"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    className="absolute top-0 left-0 h-full"
                    style={{ width: "200%", animation: "strip-wave-flow 3.2s linear infinite", filter: "drop-shadow(0 0 3px rgba(0,229,255,0.8))" }}
                  >
                    <path d={STRIP_WAVE_CYAN} stroke="#00e5ff" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.80" />
                  </svg>
                  <svg
                    viewBox="0 0 200 32"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    className="absolute top-0 left-0 h-full"
                    style={{ width: "200%", animation: "strip-wave-flow 4.8s linear infinite", filter: "drop-shadow(0 0 3px rgba(157,107,255,0.7))" }}
                  >
                    <path d={STRIP_WAVE_PURPLE} stroke="#9d6bff" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.65" />
                  </svg>
                </div>
                <p className="mt-1 text-center text-[10px] font-semibold uppercase tracking-[0.32em] text-[#00e5ff]/38 transition group-hover:text-[#00e5ff]/65">
                  Visualizer
                </p>
              </button>
              {currentSong?.youtube_url && (
                <button
                  type="button"
                  onClick={() => setShowVisualizer(true)}
                  className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-full border border-[#FF0000]/25 bg-[#FF0000]/8 py-1 text-[10px] font-semibold text-[#ff6b6b] transition hover:bg-[#FF0000]/15"
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  YouTube
                </button>
              )}
            </div>

            {/* Right column: title / artist / progress / buttons */}
            <div className="state-fade flex flex-col gap-4 rounded-[1.4rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#CBD5E1]/55">
                    Now Playing
                  </p>
                  <h2
                    className={`mt-3 text-3xl font-semibold leading-tight text-[#F8FAFC] sm:text-4xl ${
                      currentSong || isDropPlaying ? "" : "waiting-copy"
                    }`}
                  >
                    {isDropPlaying
                      ? "Station ident"
                      : currentSong
                        ? currentSong.title
                        : waitingTitle}
                    {currentSong || isDropPlaying ? null : (
                      <span className="signal-dots">...</span>
                    )}
                  </h2>
                  <p
                    className={`mt-2 text-lg font-medium text-[#CBD5E1] ${
                      currentSong || isDropPlaying ? "" : "waiting-copy"
                    }`}
                  >
                    {isDropPlaying ? (
                      activeDropLabel || "FlowSoundz Radio"
                    ) : currentSong ? (
                      <Link
                        href={`/artists/${slugifyArtistName(currentSong.artist)}`}
                        className="pointer-events-auto transition hover:text-[#F8FAFC]"
                      >
                        {currentSong.artist}
                      </Link>
                    ) : (
                      waitingArtist
                    )}
                  </p>
                  <p className="mt-2 text-sm text-[#CBD5E1]/75">
                    {isDropPlaying
                      ? "Live drop before the next record"
                      : currentSong?.album ?? "FlowSoundz station rotation"}
                  </p>
                </div>
                <span
                  className={`state-fade rounded-full px-3 py-1 text-xs font-semibold ${
                    isDropPlaying
                      ? "border border-[#FF2DA6]/20 bg-[#FF2DA6]/10 text-[#F8FAFC]"
                      : isPlaying
                        ? "border border-[#00E5FF]/20 bg-[#00E5FF]/10 text-[#F8FAFC]"
                        : "border border-white/8 bg-white/5 text-[#CBD5E1]"
                  }`}
                >
                  {isDropPlaying ? "Drop" : isPlaying ? "Live" : "Paused"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="state-fade rounded-full border border-[#8B5CF6]/18 bg-[#8B5CF6]/12 px-3 py-1 text-xs font-semibold text-[#F8FAFC]">
                  {formatVibeLabel(selectedVibe)}
                </span>
                {usingLocalCatalog ? (
                  <span className="state-fade rounded-full border border-[#00E5FF]/18 bg-[#00E5FF]/10 px-3 py-1 text-xs font-medium text-[#F8FAFC]">
                    Local catalog
                  </span>
                ) : null}
                {currentSongAccessLabel ? (
                  <span className="state-fade rounded-full border border-[#00E5FF]/18 bg-[#00E5FF]/10 px-3 py-1 text-xs font-medium text-[#F8FAFC]">
                    {currentSongAccessLabel}
                  </span>
                ) : null}
                {currentSongIsLocked ? (
                  <span className="state-fade rounded-full border border-amber-300/18 bg-amber-200/10 px-3 py-1 text-xs font-medium text-amber-100">
                    Locked for Listener
                  </span>
                ) : null}
                <span className="state-fade rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-medium text-[#CBD5E1]">
                  {isDropPlaying
                    ? `${songsUntilDrop} songs to next drop`
                    : currentSong?.genre ?? "After-hours mix"}
                </span>
                {currentSong && !isDropPlaying ? (
                  <Link
                    href={`/artists/${slugifyArtistName(currentSong.artist)}`}
                    className="pointer-events-auto state-fade rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-medium text-[#CBD5E1] transition hover:border-[#00E5FF]/25 hover:text-[#F8FAFC]"
                  >
                    Artist Profile
                  </Link>
                ) : null}
                <span className="state-fade rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-medium text-[#CBD5E1]">
                  {currentSong?.duration_sec
                    ? `${Math.floor(currentSong.duration_sec / 60)}:${String(
                        currentSong.duration_sec % 60,
                      ).padStart(2, "0")}`
                    : "Live mix"}
                </span>
              </div>

              <div>
                <div
                  className={`relative -my-3 py-3 ${duration > 0 && !isDropPlaying ? "cursor-pointer" : "cursor-default"}`}
                  onClick={handleProgressClick}
                >
                  <div className="relative h-[4px] rounded-full bg-white/[0.08]">
                    <div
                      className={`h-full rounded-full bg-[linear-gradient(90deg,#00e5ff,#7c4dff)] transition-[width] duration-200 ${isPlaying ? "shadow-[0_0_10px_rgba(0,229,255,0.7)]" : "shadow-[0_0_6px_rgba(0,229,255,0.35)]"}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                    <div
                      className={`pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00e5ff] transition-all duration-200 ${isPlaying ? "shadow-[0_0_12px_rgba(0,229,255,1),0_0_28px_rgba(0,229,255,0.6)] scale-110" : "shadow-[0_0_8px_rgba(0,229,255,0.6)]"}`}
                      style={{ left: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-[#CBD5E1]">
                  <span>{formatClock(currentTime)}</span>
                  <span>{formatClock(duration)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    togglePlayback();
                    track("start_listening_click", { action: isPlaying ? "pause" : "play" });
                  }}
                  disabled={(!currentSong && !isDropPlaying) || !!error}
                  className="play-pulse relative flex min-h-16 flex-1 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-6 text-lg font-semibold text-white shadow-[0_10px_30px_rgba(0,229,255,0.22),0_0_28px_rgba(124,77,255,0.2)] transition duration-200 hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/30 disabled:text-slate-500"
                >
                  {isPlaying ? "Pause" : "Play"}
                </button>
                <button
                  type="button"
                  onClick={() => void skipToNextTrack()}
                  disabled={queue.length === 0 || !!error || isDropPlaying}
                  className="min-h-16 rounded-full border border-white/8 bg-[#111827] px-6 text-base font-semibold text-[#F8FAFC] transition hover:border-white/12 hover:bg-[#111827]/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next Track
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const title = currentSong?.title;
                    const artist = currentSong?.artist;
                    const url = `${window.location.origin}/radio`;
                    const shareText = title && artist
                      ? `Listening to "${title}" by ${artist} on FlowSoundz Radio`
                      : `Live on FlowSoundz Radio`;
                    track("share_track_click", { title: title ?? null, artist: artist ?? null });
                    if (navigator.share) {
                      void navigator.share({ title: shareText, url }).catch(() => {});
                    } else {
                      void navigator.clipboard.writeText(`${shareText} 🎧 ${url}`).then(() => {
                        setShareCopied(true);
                        setTimeout(() => setShareCopied(false), 2500);
                      });
                    }
                  }}
                  disabled={!currentSong}
                  className="min-h-16 rounded-full border border-white/8 bg-[#111827] px-4 text-base font-semibold text-[#F8FAFC] transition hover:border-[#00e5ff]/25 hover:bg-[#111827]/90 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Copy share link"
                >
                  {shareCopied ? (
                    <span className="flex items-center gap-2 text-[#00e5ff]">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      Copied
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                      Share
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        </div>
        <div>
        <div className="state-fade mt-5 lg:mt-0 rounded-[1.8rem] border border-white/8 bg-[linear-gradient(180deg,#0B1020_0%,#050816_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#CBD5E1]/55">
                Up Next
              </p>
              <h3 className="mt-2 text-lg font-semibold text-[#F8FAFC]">
                Queue rotation
              </h3>
            </div>
            <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-medium text-[#CBD5E1]">
              {formatVibeLabel(selectedVibe)}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {isLoading ? (
              <>
                <div className="h-20 animate-pulse rounded-[1.4rem] bg-white/6" />
                <div className="h-20 animate-pulse rounded-[1.4rem] bg-white/6" />
                <div className="h-20 animate-pulse rounded-[1.4rem] bg-white/6" />
              </>
            ) : error ? (
              <div className="rounded-[1.3rem] border border-[#FF2DA6]/18 bg-[#FF2DA6]/10 px-4 py-4 text-sm text-[#F8FAFC]">
                <p>{error}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/45">
                  If the separate API is offline, refresh once to use the local catalog fallback.
                </p>
              </div>
            ) : upcomingSongs.length > 0 ? (
              upcomingSongs.map((song, index) => {
                const isNextUp = index === 0;
                const queueAccessLabel = song.is_vault
                  ? "Vault"
                  : isTrackInMembersEarlyWindow(song)
                    ? "Members Early"
                    : isTrackFeatured(song)
                      ? "Featured"
                      : null;

                return (
                  <div
                    key={`${song.id}-${index}`}
                    className={`queue-card relative flex items-center gap-4 rounded-[1.5rem] border p-4 ${
                      isNextUp
                        ? "border-[#8B5CF6]/24 bg-[linear-gradient(135deg,rgba(0,229,255,0.12),rgba(139,92,246,0.12),rgba(255,45,166,0.08))] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_30px_rgba(139,92,246,0.12)]"
                        : "border-white/8 bg-[#111827]/72 hover:border-white/12 hover:bg-[#151d30]/80"
                    }`}
                  >
                    {isNextUp ? (
                      <div className="pointer-events-none absolute inset-0 rounded-[1.5rem] bg-[radial-gradient(circle_at_20%_50%,rgba(0,229,255,0.08),transparent_28%),radial-gradient(circle_at_80%_50%,rgba(139,92,246,0.1),transparent_32%)] opacity-80" />
                    ) : null}
                    <div
                      className={`state-fade relative flex h-14 w-14 flex-none items-center justify-center rounded-[1.2rem] text-sm font-semibold ${
                        isNextUp
                          ? "bg-[linear-gradient(135deg,#00E5FF_0%,#8B5CF6_60%,#FF2DA6_100%)] text-[#050816]"
                          : "border border-white/8 bg-[#0B1020] text-[#CBD5E1]"
                      }`}
                    >
                      {isNextUp ? "Next" : String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="relative min-w-0 flex-1">
                      <p className="state-fade truncate font-medium text-[#F8FAFC]">
                        {song.title}
                      </p>
                      <p className="state-fade mt-0.5 truncate text-sm text-[#CBD5E1]">
                        <Link
                          href={`/artists/${slugifyArtistName(song.artist)}`}
                          className="pointer-events-auto transition hover:text-[#F8FAFC]"
                        >
                          {song.artist}
                        </Link>
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {isNextUp ? (
                          <span className="state-fade rounded-full border border-[#00E5FF]/18 bg-[#00E5FF]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#F8FAFC]">
                            Coming up
                          </span>
                        ) : null}
                        {queueAccessLabel ? (
                          <span className={`state-fade rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] ${
                            queueAccessLabel === "Vault"
                              ? "border-[#00e5ff]/40 bg-[#00e5ff]/10 text-[#00e5ff] shadow-[0_0_8px_rgba(0,229,255,0.3)]"
                              : "border-white/8 bg-white/5 text-[#CBD5E1]"
                          }`}>
                            {queueAccessLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <span className="state-fade relative rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-medium text-[#CBD5E1]">
                      {formatVibeLabel(song.vibe ?? selectedVibe)}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-sm leading-6 text-[#CBD5E1]">
                No songs are available in this vibe queue yet.
              </p>
            )}
          </div>
        </div>

        {recentlyPlayed.length > 0 ? (
          <div className="state-fade mt-5 rounded-[1.8rem] border border-white/8 bg-[linear-gradient(180deg,#0B1020_0%,#050816_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#CBD5E1]/55">
                Recently Played
              </p>
              <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-medium text-[#CBD5E1]">
                {recentlyPlayed.length} tracks
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
              {recentlyPlayed.map((song) => (
                <div key={song.id} className="flex shrink-0 flex-col gap-2 w-[90px]">
                  <div className="relative h-[90px] w-[90px] overflow-hidden rounded-[1rem] border border-white/8 bg-[#0B1020]">
                    {song.coverUrl ? (
                      <CoverArt
                        src={song.coverUrl}
                        alt={song.title}
                        sizes="90px"
                        className="object-cover opacity-80"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xl text-white/20">♪</div>
                    )}
                  </div>
                  <p className="truncate text-[11px] font-medium text-[#F8FAFC]/70">{song.title}</p>
                  <p className="truncate text-[10px] text-[#CBD5E1]/50">{song.artist}</p>
                  <Link
                    href={`/artists/${slugifyArtistName(song.artist)}`}
                    className="text-[10px] text-[#00E5FF]/60 transition hover:text-[#F8FAFC]"
                  >
                    Profile
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        </div>
        </div>

        <VisualizerModal
          key={currentSong?.id ?? "no-song"}
          isOpen={showVisualizer}
          onClose={() => setShowVisualizer(false)}
          song={currentSong}
          analyser={visualizerAnalyser}
          isPlaying={isPlaying}
          mode={visualizerMode}
          onModeChange={setVisualizerMode}
        />

        {/* ── Coming up this hour ── */}
        {upcomingSongs.length > 0 && (
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#CBD5E1]/55">
                Coming up this hour
              </p>
              <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-medium text-[#CBD5E1]">
                {upcomingSongs.length} tracks
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2">
              {upcomingSongs.map((song, i) => (
                <div
                  key={`${song.id}-${i}`}
                  className="queue-card flex shrink-0 flex-col gap-2 rounded-[1.4rem] border border-white/8 bg-[#111827]/72 p-3 w-[130px]"
                >
                  <div className="relative h-[104px] w-full overflow-hidden rounded-[1rem] border border-white/8 bg-[#0B1020]">
                    <CoverArt
                      src={getCoverUrl(song)}
                      alt={song.title}
                      sizes="130px"
                      className="object-cover"
                    />
                    <div className="absolute bottom-1.5 right-1.5 rounded-full border border-white/10 bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white/70">
                      {i + 1}
                    </div>
                  </div>
                  <p className="truncate text-[11px] font-medium text-[#F8FAFC]/80">{song.title}</p>
                  <p className="truncate text-[10px] text-[#CBD5E1]/50">
                    <Link
                      href={`/artists/${slugifyArtistName(song.artist)}`}
                      className="pointer-events-auto transition hover:text-[#F8FAFC]"
                    >
                      {song.artist}
                    </Link>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AiDjChat
        djName={activeDJ.displayName}
        djTone={activeDJ.tone}
        vibe={selectedVibe === "all" ? "chill" : selectedVibe}
        currentSongTitle={currentSong?.title}
        currentSongArtist={currentSong?.artist}
      />
    </section>
  );
}

function moveSongAwayFromFront(queue: Song[], previousSongId?: string): Song[] {
  if (!previousSongId || queue.length < 2 || queue[0]?.id !== previousSongId) {
    return queue;
  }

  const nextIndex = queue.findIndex((song) => song.id !== previousSongId);
  if (nextIndex <= 0) {
    return queue;
  }

  const nextQueue = [...queue];
  const [nextSong] = nextQueue.splice(nextIndex, 1);
  nextQueue.unshift(nextSong);
  return nextQueue;
}

function getNextTrackIndex(queue: Song[], currentIndex: number): number {
  if (queue.length <= 1) {
    return 0;
  }

  const currentSongId = queue[currentIndex]?.id;
  const defaultNextIndex = (currentIndex + 1) % queue.length;

  if (queue[defaultNextIndex]?.id !== currentSongId) {
    return defaultNextIndex;
  }

  const fallbackIndex = queue.findIndex(
    (song, index) => index !== currentIndex && song.id !== currentSongId,
  );

  return fallbackIndex >= 0 ? fallbackIndex : defaultNextIndex;
}
