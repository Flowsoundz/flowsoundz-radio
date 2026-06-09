"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics";
import {
  useGlobalAudioRefs,
  useGlobalAudioState,
} from "@/components/GlobalAudioProvider";
import { playTrack } from "@/lib/playbackController";
import {
  registerTrackSignal,
  reorderQueueByLocalSignals,
} from "@/lib/radioQueueTuning";
import {
  DEFAULT_USER_TIER,
  canUserTierAccessTrack,
  isTrackFeatured,
  isTrackInMembersEarlyWindow,
} from "@/lib/access";
import { slugifyArtistName } from "@/lib/artists";
import { getCatalogSnapshot } from "@/lib/catalogSnapshot";
import { ArtistQuickPanel } from "@/components/ArtistQuickPanel";
import { CoverArt } from "@/components/CoverArt";
import {
  canUseNativeHls,
  getCoverUrl,
  getDefaultCoverUrl,
  getHlsUrl,
  getPreferredPlaybackUrl,
  getQueue,
  getSongs,
} from "@/lib/api";
import { formatVibeLabel } from "@/lib/format";
import { getDJPersonality } from "@/lib/djPersonalities";
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
import {
  type VisualizerModeId,
} from "@/lib/visualizerModes";
import type Hls from "hls.js";
import { getLyrics } from "@/lib/lyrics";
import { useVibePoints } from "@/lib/useVibePoints";
import { useUserTier } from "@/lib/useUserTier";
import { isSpecialNarrationMoment } from "@/lib/radioContext";

const VisualizerModal = dynamic(
  () =>
    import("@/components/VisualizerModal").then((module) => ({
      default: module.VisualizerModal,
    })),
  {
    ssr: false,
  },
);

const VisualizerCanvasThree = dynamic(
  () =>
    import("@/components/VisualizerCanvasThree").then((module) => ({
      default: module.VisualizerCanvasThree,
    })),
  {
    ssr: false,
  },
);

const AiDjChat = dynamic(
  () =>
    import("@/components/AiDjChat").then((module) => ({
      default: module.AiDjChat,
    })),
  {
    ssr: false,
  },
);

const LiveChat = dynamic(
  () =>
    import("@/components/LiveChat").then((module) => ({
      default: module.LiveChat,
    })),
  { ssr: false },
);

const AuthButton = dynamic(
  () => import("@/components/AuthButton").then((m) => ({ default: m.AuthButton })),
  { ssr: false },
);

const HypeVote = dynamic(
  () => import("@/components/HypeVote").then((m) => ({ default: m.HypeVote })),
  { ssr: false },
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
  "FlowSoundz is in Continuous Mix Mode. Curated selection is on air while the live rotation syncs.";
const ARCHIVE_STANDBY_MESSAGE =
  "FlowSoundz Continuous Mix Mode is active. Browse the curated catalog and artist profiles while the live rotation comes online.";
const PLAYBACK_START_ERROR =
  "Playback could not start. Tap again or check the audio source.";
const RADIO_DEBUG =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_RADIO_DEBUG === "1";
const TIME_UPDATE_THROTTLE_MS = 250;

function debugLog(message: string, details?: unknown) {
  if (!RADIO_DEBUG) {
    return;
  }

  if (details === undefined) {
    console.log(message);
    return;
  }

  console.log(message, details);
}

function debugWarn(message: string, details?: unknown) {
  if (!RADIO_DEBUG) {
    return;
  }

  if (details === undefined) {
    console.warn(message);
    return;
  }

  console.warn(message, details);
}

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
  queueMode?: "live" | "archive" | "empty";
};

function getTransitionSource(
  transitionAudioMode: PreparedStationEvent["transitionAudioMode"],
): "forced" | "drop" | "narration" | "direct" {
  if (FORCE_DROP_TEST_MODE) {
    return "forced";
  }

  return transitionAudioMode;
}

function getInitialBroadcastReturnWindow() {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(Date.now() + 45 * 60 * 1000));
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
      queueMode:
        parsed.queueMode === "live" ||
        parsed.queueMode === "archive" ||
        parsed.queueMode === "empty"
          ? parsed.queueMode
          : undefined,
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
    debugLog("[BED PRELOAD]", {
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

  debugLog("[BED PRELOAD]", {
    bedId: bed.id,
    bedSrc: bed.src,
    vibe: bed.vibe,
  });
}

export default function RadioPlayer() {
  const {
    audioRef,
    audioContextRef,
    analyserRef: sharedAnalyserRef,
    setCurrentTrack,
    togglePlaybackRef,
    skipTrackRef,
    requestOnDemandRef,
    setPlaybackMode,
    duckMain,
  } = useGlobalAudioRefs();
  const { isReady: isAudioReady, playbackMode } = useGlobalAudioState();
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
  const playbackModeRef = useRef<"live" | "on-demand">("live");
  const currentSongRef = useRef<Song | null>(null);
  const currentTrackIdRef = useRef<string | null>(null);
  const playbackSessionTrackIdRef = useRef<string | null>(null);
  const playbackRecoveryInFlightRef = useRef(false);
  const trackFailureCountsRef = useRef<Record<string, number>>({});
  const requestedTrackStartIdRef = useRef<string | null>(null);
  const activeTrackSourceKeyRef = useRef<string | null>(null);
  const skipToNextTrackRef = useRef<
    (reason?: "user" | "complete" | "recovery") => Promise<void>
  >(async () => {});
  const handleTimeUpdateRef = useRef<() => void>(() => {});
  const handleLoadedMetadataRef = useRef<() => void>(() => {});
  const lastCurrentTimeUiUpdateRef = useRef(0);
  const lastPersistedPlaybackKeyRef = useRef("");
  const smartNarrationAudioRef = useRef<string | null>(null);
  const smartNarrationFetchKeyRef = useRef<string | null>(null);
  const smartNarrationCacheRef = useRef<Map<string, string>>(new Map());
  const songTransitionCountRef = useRef(0);
  const listenerCoordsRef = useRef<{ lat: number; lon: number } | null>(null);

  const [showVisualizer, setShowVisualizer] = useState(false);
  const [showArtistPanel, setShowArtistPanel] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [queue, setQueue] = useState<Song[]>([]);
  const [selectedVibe, setSelectedVibe] = useState("all");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const { balance: vibeBalance, boost: boostTrack } = useVibePoints(isPlaying);
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
  const [nextBroadcastTime] = useState(getInitialBroadcastReturnWindow);
  const songsUntilDropRef = useRef(songsUntilDrop);
  const { tier: currentUserTier } = useUserTier();

  const defaultCoverUrl = getDefaultCoverUrl();
  const currentSong = queue[currentIndex] ?? null;
  const hasPlayableQueue = queue.some((song) => song.is_playable);
  const queueSnapshot = useMemo(() => getCatalogSnapshot(queue), [queue]);
  const stationMode = queueSnapshot.stationMode;
  const currentArtistProfile = useMemo(() => {
    if (!currentSong) return null;
    const slug = slugifyArtistName(currentSong.artist);
    return queueSnapshot.artists.find((a) => a.slug === slug) ?? null;
  }, [currentSong, queueSnapshot.artists]);
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

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);
  const activeDJ = getDJPersonality(
    selectedVibe === "all" ? "chill" : selectedVibe,
  );
  const waitingTitle = "Broadcast standby";
  const waitingArtist = "Next broadcast loading";
  const progressPercent =
    duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
  const currentBed = preparedEvent?.plannedBed ?? null;
  const usingFallbackCatalog = queueSnapshot.isFallbackCatalog;
  const archivePlaybackMode = stationMode === "playable_archive";
  const archiveStandbyMode = archivePlaybackMode && !hasPlayableQueue;
  const maintenanceMode =
    stationMode === "maintenance" || (Boolean(error) && queue.length === 0);

  useEffect(() => {
    debugLog("[RadioPlayer] runtime config", {
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

    const persistedState = {
      songId: currentSong?.id ?? null,
      selectedVibe,
      currentTime: Math.floor(currentTime),
      shouldPlay,
      queueMode: queue.length === 0 ? "empty" : hasPlayableQueue ? "live" : "archive",
    } satisfies PersistedRadioPlayerState;
    const persistKey = JSON.stringify({
      ...persistedState,
      timeBucket: Math.floor(persistedState.currentTime / 5),
    });

    if (persistKey === lastPersistedPlaybackKeyRef.current) {
      return;
    }

    lastPersistedPlaybackKeyRef.current = persistKey;

    try {
      window.localStorage.setItem(
        RADIO_PLAYER_STATE_STORAGE_KEY,
        JSON.stringify(persistedState),
      );
    } catch {
      // Ignore persistence write failures.
    }
  }, [currentSong, currentTime, hasPlayableQueue, isDropPlaying, queue.length, selectedVibe, shouldPlay]);

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

  // Fetch stream auth cookie on mount, refresh every 50 min to keep audio access alive.
  useEffect(() => {
    const fetchStreamAuth = () => { void fetch("/api/stream/auth"); };
    fetchStreamAuth();
    const id = window.setInterval(fetchStreamAuth, 50 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  // Silently grab listener coords once — used to localise weather in DJ narration.
  // Falls back to Orlando if denied or unavailable.
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        listenerCoordsRef.current = { lat: coords.latitude, lon: coords.longitude };
      },
      () => undefined,
      { timeout: 5000, maximumAge: 30 * 60 * 1000 },
    );
  }, []);

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

    if (isFullView && isPlaying && ambientCoverActive) {
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
  }, [ambientCoverActive, audioRef, isDropPlaying, isFullView, isPlaying]);


  useEffect(() => {
    let isMounted = true;

    async function loadQueueForVibe() {
      setIsLoading(true);

      try {
        const nextQueue =
          selectedVibe === "all"
            ? await getSongs()
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
        const tunedQueue = reorderQueueByLocalSignals(reorderedQueue);
        const playableQueueAvailable = tunedQueue.some((song) => song.is_playable);
        const nextSnapshot = getCatalogSnapshot(tunedQueue);
        const nextQueueMode: PersistedRadioPlayerState["queueMode"] =
          tunedQueue.length === 0
            ? "empty"
            : nextSnapshot.stationMode === "live"
              ? "live"
              : "archive";
        const rawPersistedState = pendingRestoreStateRef.current;
        const persistedState =
          rawPersistedState?.queueMode && rawPersistedState.queueMode !== nextQueueMode
            ? null
            : rawPersistedState;
        const restoredIndex =
          persistedState?.songId
            ? tunedQueue.findIndex((song) => song.id === persistedState.songId)
            : -1;

        debugLog("[RadioPlayer] queue ready", {
          selectedVibe,
          queueLength: tunedQueue.length,
          firstTrack: tunedQueue[0] ?? null,
        });

        setQueue(tunedQueue);
        setCurrentIndex(restoredIndex >= 0 ? restoredIndex : 0);
        setCurrentTime(restoredIndex >= 0 ? persistedState?.currentTime ?? 0 : 0);
        setDuration(0);
        setShouldPlay(
          restoredIndex >= 0
            ? playableQueueAvailable && (persistedState?.shouldPlay ?? (nextQueue.length > 0))
            : false,
        );
        setError(
          nextQueue.length === 0
            ? "No songs are available in this vibe queue yet."
            : nextSnapshot.stationMode === "maintenance"
              ? ARCHIVE_STANDBY_MESSAGE
              : "",
        );
        setIsDropPlaying(false);
        setActiveDropLabel("");
        setPreparedEvent(null);
        pendingTrackIndexRef.current = null;
        pendingRestoreStateRef.current = restoredIndex >= 0 ? persistedState : null;
        recentDropIdsRef.current = [];
        recentBedIdsRef.current = [];
        songsUntilDropRef.current = getRandomDropInterval();
        setSongsUntilDrop(songsUntilDropRef.current);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setQueue([]);
        setCurrentIndex(0);
        setShouldPlay(false);
        setError(
          error instanceof Error && error.message
            ? error.message
            : RADIO_BACKEND_ERROR,
        );
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
    setShowArtistPanel(false);
    setShowLyrics(false);
  }, [currentSong?.id]);

  useEffect(() => {
    isDropPlayingRef.current = isDropPlaying;
  }, [isDropPlaying]);

  useEffect(() => {
    playbackModeRef.current = playbackMode;
  }, [playbackMode]);

  useEffect(() => {
    if (!isPlaying) {
      currentTrackIdRef.current = null;
    }
  }, [isPlaying]);

  const recoverFromPlaybackFailure = useCallback((reason: string, details?: unknown) => {
    const failedSong = currentSongRef.current;

    if (!failedSong) {
      setError(PLAYBACK_START_ERROR);
      setShouldPlay(false);
      return;
    }

    registerTrackSignal(failedSong, "fail");
    const failureCount = (trackFailureCountsRef.current[failedSong.id] ?? 0) + 1;
    trackFailureCountsRef.current[failedSong.id] = failureCount;

    debugWarn("[RadioPlayer] playback recovery triggered", {
      reason,
      songId: failedSong.id,
      title: failedSong.title,
      failureCount,
      details,
    });

    if (
      playbackRecoveryInFlightRef.current ||
      queue.length <= 1 ||
      failureCount >= 2
    ) {
      setError(PLAYBACK_START_ERROR);
      setShouldPlay(false);
      return;
    }

    playbackRecoveryInFlightRef.current = true;
    setError(`Track issue detected. Skipping "${failedSong.title}" to keep the station moving.`);

    window.setTimeout(() => {
      playbackRecoveryInFlightRef.current = false;
      void skipToNextTrackRef.current("recovery");
    }, 120);
  }, [queue.length]);

  useEffect(() => {
    if (!currentSong) {
      setCurrentTrack(null);
      return;
    }

    const coverSrc = getCoverUrl(currentSong);
    const artwork = Array.isArray(coverSrc) ? (coverSrc[0] ?? null) : (coverSrc ?? null);
    setCurrentTrack({
      id: currentSong.id,
      src: getPreferredPlaybackUrl(currentSong, audioRef.current),
      title: currentSong.title,
      artist: currentSong.artist,
      artwork,
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
    const baseNarration = getNarrationEventForVibe(
      nextVibe ?? nextSong.vibe ?? selectedVibe,
      plan,
    );
    const smartSrc = smartNarrationAudioRef.current;
    const plannedNarration = smartSrc
      ? { ...baseNarration, clipSrc: smartSrc }
      : baseNarration;
    if (smartSrc) smartNarrationAudioRef.current = null;
    const plannedBed = getTransitionBedForVibe(
      nextVibe ?? nextSong.vibe ?? selectedVibe,
      recentBedIdsRef.current,
    );
    const narrationHasAudio = Boolean(plannedNarration.clipSrc?.trim());
    debugLog("[RadioPlayer] narration audio resolved", {
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
        debugLog("[RadioPlayer] narration missing audio -> fallback to drop", {
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

    debugLog("[RadioPlayer] selected narration candidate", prepared.plannedNarration);
    debugLog("[RadioPlayer] selected host/vibe", {
      voice: prepared.plannedNarration.voice,
      vibe: prepared.plannedNarration.vibe,
      transitionAudioMode: prepared.transitionAudioMode,
      narrationFallback: prepared.plannedNarration.usedFallback,
    });
    debugLog("[RadioPlayer] runtime config", {
      forceDropTestMode: FORCE_DROP_TEST_MODE,
      selectedTransitionMode: prepared.transitionAudioMode,
      narrationHasAudio,
    });
    debugLog("[RadioPlayer] transition source resolved", {
      source: transitionSource,
    });
    debugLog("[RadioPlayer] transition type used", {
      transitionAudioMode: prepared.transitionAudioMode,
      forced: transitionSource === "forced",
    });
    debugLog("[RadioPlayer] transition decision final", {
      source: prepared.transitionAudioMode,
      vibe: nextVibe ?? nextSong.vibe ?? selectedVibe,
      narrationHasAudio,
      usedFallback,
    });
    debugLog("[RadioPlayer] transition bed prepared", {
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
        debugLog("[RadioPlayer] blocked track load during drop", {
          songId: currentSong?.id ?? null,
        });
      }
      return;
    }

    if (!canUserTierAccessTrack(currentSong, currentUserTier)) {
      audioElement.pause();
      return;
    }

    if (!currentSong.is_playable) {
      audioElement.pause();
      isPlayingRef.current = false;
      return;
    }

    const mediaElement = audioElement;
    // HLS cleanup is deferred to loadTrackSource — only destroy when the source key
    // actually changes (new track). Destroying here runs on every shouldPlay toggle
    // (including pause), which tears down the active HLS.js MediaSource mid-playback.
    const hlsUrl = getHlsUrl(currentSong);
    const preferredUrl = getPreferredPlaybackUrl(currentSong, mediaElement);
    const trackToPlay = {
      id: currentSong.id,
      src: preferredUrl,
      title: currentSong.title,
      artist: currentSong.artist,
    };
    const startResolvedTrack = async (resolvedSrc: string) => {
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

      debugLog("track start:", trackToPlay.id);
      debugLog("[RadioPlayer] resolved audio src", {
        trackId: trackToPlay.id,
        preferredUrl,
        hlsUrl,
        resolvedSrc,
        currentSrc: mediaElement.currentSrc || mediaElement.src,
      });

      const result = await playTrack(audioRef, {
        ...trackToPlay,
        src: resolvedSrc,
      }, audioContextRef);

      if (!result.ok && result.reason === "busy") {
        return;
      }

      if (!result.ok) {
        setError(PLAYBACK_START_ERROR);
        return;
      }

      if (playbackSessionTrackIdRef.current !== trackToPlay.id) {
        registerTrackSignal(currentSongRef.current, "play");
        playbackSessionTrackIdRef.current = trackToPlay.id;
      }
      setError("");
    };
    const sourceKey =
      hlsUrl && !canUseNativeHls(mediaElement)
        ? hlsUrl
        : preferredUrl;

    if (hlsUrl && canUseNativeHls(mediaElement)) {
      if ((mediaElement.currentSrc || mediaElement.src).includes(hlsUrl)) {
        activeTrackSourceKeyRef.current = sourceKey;
        void startResolvedTrack(hlsUrl);
        return;
      }

      // URL changed — clean up any stale HLS.js instance before native HLS takes over
      hlsRef.current?.destroy();
      hlsRef.current = null;
      activeTrackSourceKeyRef.current = sourceKey;
      isPlayingRef.current = false;
      mediaElement.src = hlsUrl;
      mediaElement.load();
      void startResolvedTrack(hlsUrl);
      return;
    }

    let cancelled = false;

    async function loadTrackSource() {
      if (activeTrackSourceKeyRef.current === sourceKey) {
        await startResolvedTrack(mediaElement.currentSrc || mediaElement.src || preferredUrl);
        return;
      }

      // Source is changing — safe to tear down the existing HLS.js instance now
      hlsRef.current?.destroy();
      hlsRef.current = null;

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
            void startResolvedTrack(mediaElement.currentSrc || mediaElement.src || hlsUrl);
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
  }, [audioContextRef, audioRef, currentSong, currentUserTier, isDropPlaying, shouldPlay]);

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
      registerTrackSignal(currentSongRef.current, "complete");
      track("track_complete", {
        trackId: currentSongRef.current?.id ?? null,
        title: currentSongRef.current?.title ?? null,
        artist: currentSongRef.current?.artist ?? null,
        vibe: currentSongRef.current?.vibe ?? null,
        source: "radio_player",
      });
      void skipToNextTrackRef.current("complete");
    };

    audio.onerror = () => {
      // MEDIA_ERR_ABORTED (1) fires whenever audio.src changes mid-load (new track,
      // queue reset, vibe switch). It is not a playback failure — ignore it to
      // prevent the recovery handler from skipping to the next track unnecessarily.
      if (audio.error?.code === 1) return;
      setIsPlaying(false);
      isPlayingRef.current = false;
      recoverFromPlaybackFailure("audio_error", {
        currentSrc: audio.currentSrc || audio.src || null,
        readyState: audio.readyState,
        networkState: audio.networkState,
        errorCode: audio.error?.code ?? null,
      });
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
  }, [audioRef, isAudioReady, recoverFromPlaybackFailure]);

  function moveToTrack(index: number) {
    debugLog("[RadioPlayer] moveToTrack", {
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
    playbackSessionTrackIdRef.current = null;
    transitionInFlightRef.current = false;
    isPlayingRef.current = false;
    songTransitionCountRef.current += 1;
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
    const playbackToken = dropPlaybackTokenRef.current + 1;
    dropPlaybackTokenRef.current = playbackToken;

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

    const transitionAudio = dropAudioRef.current;

    const finishTransition = () => {
      if (dropPlaybackTokenRef.current !== playbackToken) return;
      setIsDropPlaying(false);
      setActiveDropLabel("");
      moveToTrack(nextIndex);
    };

    if (!transitionAudio || !src) {
      transitionAudioStopTimerRef.current = window.setTimeout(finishTransition, 90);
      return;
    }

    transitionAudio.pause();
    transitionAudio.volume = Math.min(Math.max(volume, 0), 1);
    transitionAudio.playbackRate = playbackRate;
    transitionAudio.src = src;
    transitionAudio.currentTime = 0;

    const cleanup = () => {
      transitionAudio.removeEventListener("ended", onEnded);
      transitionAudio.removeEventListener("error", onError);
      clearTransitionAudioStopTimer(transitionAudioStopTimerRef);
    };

    const onEnded = () => { cleanup(); finishTransition(); };
    const onError = () => { cleanup(); finishTransition(); };

    transitionAudio.addEventListener("ended", onEnded);
    transitionAudio.addEventListener("error", onError);

    // Safety timeout — clips should be well under 60s
    transitionAudioStopTimerRef.current = window.setTimeout(() => {
      cleanup();
      transitionAudio.pause();
      finishTransition();
    }, 60_000);

    debugLog(`[RadioPlayer] ${mode} transition playing`, { nextIndex, src, volume, playbackRate });

    try {
      await transitionAudio.play();
    } catch {
      cleanup();
      finishTransition();
    }
  }

  async function playNarrationBed(src: string, nextIndex: number) {
    const bedAudio = transitionBedAudioRef.current;

    if (!bedAudio) {
      return;
    }

    if (!src || !isTransitionBedSrc(src)) {
      debugWarn("[RadioPlayer] narration bed skipped due to invalid src", {
        nextIndex,
        src,
      });
      resetAudioElement(bedAudio);
      return;
    }

    debugLog("[RadioPlayer] narration bed bypassed", {
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

    debugLog("[RadioPlayer] selected drop candidate", {
      vibe: dropVibe,
      dropId: drop?.id ?? null,
      dropLabel,
      forced: transitionSource === "forced",
      usedFallback: forcedDropSelection?.usedFallback ?? false,
    });

    debugLog("[RadioPlayer] selecting drop path", {
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
      debugLog("[RadioPlayer] drop unavailable, moving directly to track", {
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

    debugLog("[RadioPlayer] narration candidate selected for playback", {
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

    // On-demand tracks play directly — no DJ drops or narration. Resume live after.
    if (playbackModeRef.current === "on-demand") {
      setPlaybackMode("live");
      moveToTrack(nextIndex);
      return;
    }

    if (prepared?.transitionAudioMode === "narration") {
      debugLog("[RadioPlayer] routing through narration", {
        nextIndex,
        narrationId: prepared.plannedNarration.id,
      });
      songsUntilDropRef.current = getRandomDropInterval();
      setSongsUntilDrop(songsUntilDropRef.current);
      void playNarrationBeforeTrack(nextIndex, prepared);
      return;
    }

    if (prepared?.transitionAudioMode === "drop") {
      debugLog("[RadioPlayer] routing through DJ drop", {
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

    debugLog("[RadioPlayer] queue transition", {
      reason,
      nextIndex,
      fadeDurationMs,
      enableDjDrops: ENABLE_DJ_DROPS,
    });

    try {
      if (audio && !audio.paused) {
        await fadeOutAudio(audio, fadeDurationMs);
      }

      executeStationEvent(nextPrepared);
    } catch (error) {
      transitionInFlightRef.current = false;
      throw error;
    }
  }

  async function skipToNextTrack(
    skipReason: "user" | "complete" | "recovery" = "user",
  ) {
    if (isSkippingRef.current) return;

    isSkippingRef.current = true;

    try {
      if (skipReason === "user") {
        registerTrackSignal(currentSong, "skip");
        track("track_skip", {
          trackId: currentSong?.id ?? null,
          title: currentSong?.title ?? null,
          artist: currentSong?.artist ?? null,
          vibe: currentSong?.vibe ?? null,
          source: "radio_player",
        });
      } else if (skipReason === "recovery") {
        track("track_skip", {
          trackId: currentSong?.id ?? null,
          title: currentSong?.title ?? null,
          artist: currentSong?.artist ?? null,
          vibe: currentSong?.vibe ?? null,
          source: "playback_recovery",
        });
      }
      await queueTransitionToNextTrack(skipReason === "user" ? "skip" : "auto");
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

    if (currentSong && !currentSong.is_playable) {
      setShouldPlay(false);
      setError(ARCHIVE_STANDBY_MESSAGE);
      return;
    }

    if (isPlaying) {
      debugLog("[RadioPlayer] pause requested", {
        currentSrc: activeAudio.currentSrc || activeAudio.src || null,
        currentTime: activeAudio.currentTime,
        paused: activeAudio.paused,
        readyState: activeAudio.readyState,
      });
      activeAudio.pause();
      setShouldPlay(false);
      return;
    }

    // Resume when the element has a loaded source and is paused — regardless of
    // currentTime, since time=0 is valid (e.g. right after a track transition).
    // Using currentTime > 0 was the root cause: it fell through to the first-start
    // path which called playTrack with preferredUrl, resetting audio.src and
    // breaking any active HLS.js MediaSource.
    const isResumingTrack =
      activeAudio === audioRef.current &&
      Boolean(currentSong) &&
      Boolean(activeAudio.currentSrc || activeAudio.src) &&
      activeAudio.paused &&
      !activeAudio.ended;

    if (isResumingTrack && currentSong) {
      debugLog("[RadioPlayer] resume requested", {
        trackId: currentSong.id,
        currentSrc: activeAudio.currentSrc || activeAudio.src || null,
        currentTime: activeAudio.currentTime,
        paused: activeAudio.paused,
        readyState: activeAudio.readyState,
        volume: activeAudio.volume,
        muted: activeAudio.muted,
      });
      setError("");
      setShouldPlay(true);
      activeAudio.muted = false;
      if (activeAudio.volume <= 0) {
        activeAudio.volume = 1;
      }

      void (async () => {
        try {
          if (audioContextRef.current?.state === "suspended") {
            await audioContextRef.current.resume();
          }
          await activeAudio.play();
          debugLog("[RadioPlayer] resume success", {
            currentSrc: activeAudio.currentSrc || activeAudio.src || null,
            currentTime: activeAudio.currentTime,
            paused: activeAudio.paused,
            readyState: activeAudio.readyState,
          });
        } catch (error) {
          console.error("[RadioPlayer] resume failed", {
            currentSrc: activeAudio.currentSrc || activeAudio.src || null,
            currentTime: activeAudio.currentTime,
            paused: activeAudio.paused,
            readyState: activeAudio.readyState,
            error,
          });
          setError(PLAYBACK_START_ERROR);
        }
      })();
      return;
    }

    if (currentSong) {
      const preferredUrl = getPreferredPlaybackUrl(currentSong, audioRef.current);
      debugLog("[RadioPlayer] user requested playback", {
        trackId: currentSong.id,
        preferredUrl,
        currentSrc: audioRef.current?.currentSrc || audioRef.current?.src || null,
        muted: audioRef.current?.muted ?? null,
        volume: audioRef.current?.volume ?? null,
      });
      requestedTrackStartIdRef.current = currentSong.id;
      // Set early so the useEffect's startResolvedTrack guard returns without
      // calling playTrack a second time while this direct call is in-flight.
      currentTrackIdRef.current = currentSong.id;
      setError("");
      setShouldPlay(true);
      void playTrack(
        audioRef,
        {
          id: currentSong.id,
          src: preferredUrl,
        },
        audioContextRef,
      ).then((result) => {
        if (!result.ok) {
          // Reset so the useEffect can retry on next shouldPlay toggle.
          currentTrackIdRef.current = null;
          setError(PLAYBACK_START_ERROR);
          return;
        }

        requestedTrackStartIdRef.current = null;
      });
    }
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const now = window.performance.now();
    if (now - lastCurrentTimeUiUpdateRef.current >= TIME_UPDATE_THROTTLE_MS) {
      setCurrentTime(audio.currentTime);
      lastCurrentTimeUiUpdateRef.current = now;
    }

    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setDuration((current) =>
        current !== audio.duration ? audio.duration : current,
      );

      // Pre-fetch smart narration at 30s remaining for special moments
      if (
        currentSong &&
        !isDropPlaying &&
        audio.duration - audio.currentTime <= 30 &&
        audio.duration - audio.currentTime > 25 &&
        queue.length > 1
      ) {
        const nextIdx = getNextTrackIndex(queue, currentIndex);
        const nextSong = queue[nextIdx];
        if (nextSong && isSpecialNarrationMoment(songTransitionCountRef.current)) {
          const fetchKey = `${Math.floor(Date.now() / 3600000)}-${currentSong.id}-${nextSong.id}`;
          if (smartNarrationFetchKeyRef.current !== fetchKey) {
            smartNarrationFetchKeyRef.current = fetchKey;
            const cached = smartNarrationCacheRef.current.get(fetchKey);
            if (cached) {
              smartNarrationAudioRef.current = cached;
            } else {
              void fetch("/api/radio/smart-narrate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  currentSongTitle: currentSong.title,
                  currentSongArtist: currentSong.artist,
                  nextSongTitle: nextSong.title,
                  nextSongArtist: nextSong.artist,
                  vibe: selectedVibe,
                  ...(listenerCoordsRef.current ?? {}),
                }),
              }).then(async (res) => {
                if (!res.ok) return;
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                smartNarrationAudioRef.current = url;
                smartNarrationCacheRef.current.set(fetchKey, url);
              }).catch(() => undefined);
            }
          }
        }
      }

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

  // On-demand: insert song immediately after current position and jump to it
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  useEffect(() => {
    requestOnDemandRef.current = (song: Song) => {
      setPlaybackMode("on-demand");
      setQueue((prev) => {
        const next = [...prev];
        const insertAt = currentIndexRef.current + 1;
        next.splice(insertAt, 0, { ...song, is_playable: true });
        return next;
      });
      setCurrentIndex((prev) => prev + 1);
      setShouldPlay(true);
    };
    return () => {
      requestOnDemandRef.current = null;
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
    ? Array.from({ length: Math.max(queue.length - 1, 0) }, (_, offset) => {
        return queue[(currentIndex + offset + 1) % queue.length];
      }).filter(Boolean)
    : [];
  const upcomingSongsPreview = upcomingSongs.slice(0, 8);
  const standbyArchiveSongs = !currentSong ? queue.slice(0, 4) : [];

  if (!isFullView) {
    return null;
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
      {/* Hidden audio elements for transition clips (narration + drops) */}
      <audio ref={dropAudioRef} preload="none" style={{ display: "none" }} />
      <audio ref={transitionBedAudioRef} preload="none" style={{ display: "none" }} />

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
              isActive={isFullView}
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
            <div className="pointer-events-auto absolute right-3 top-3 z-20">
              <AuthButton />
            </div>
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
            <button
              type="button"
              onClick={() => setShowChat(true)}
              className="flex min-w-0 items-center gap-2 rounded-full border border-white/8 bg-white/5 px-3 py-1.5 transition hover:border-white/14 hover:bg-white/8"
            >
              <svg className="h-3.5 w-3.5 text-[#00E5FF]/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              <span className="text-[11px] text-[#CBD5E1]/40">Chat</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </button>
          </div>
        </div>

        {/* Hype / Skip voting */}
        {currentSong && !isDropPlaying && (
          <div className="mt-4 flex items-center gap-3">
            <span className="text-[11px] text-slate-500">Rate this track:</span>
            <HypeVote songId={currentSong.id} />
          </div>
        )}

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
                          {currentSong?.producer && !isDropPlaying && (
                            <p className="mt-0.5 text-[10px] tracking-wide text-[#00E5FF]/50">
                              prod. {currentSong.producer}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Visualizer strip — same width as album art, below it */}
              <button
                type="button"
                onClick={() => {
                  setShowVisualizer(true);
                  track("visualizer_open", { source: "radio_player_hero" });
                }}
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
                  onClick={() => {
                    setShowVisualizer(true);
                    track("visualizer_open", { source: "radio_player_card" });
                  }}
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
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#CBD5E1]/55">
                      {archivePlaybackMode ? "Continuous Mix" : archiveStandbyMode ? "FlowSoundz" : "Now Playing"}
                    </p>
                    {playbackMode === "on-demand" ? (
                      <span className="rounded-full border border-[#00E5FF]/30 bg-[#00E5FF]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#00E5FF]">
                        On Demand
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full border border-[#FF2DA6]/25 bg-[#FF2DA6]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#FF2DA6]">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#FF2DA6]" />
                        Live
                      </span>
                    )}
                  </div>
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
                      <button
                        type="button"
                        onClick={() => setShowArtistPanel(true)}
                        className="pointer-events-auto transition hover:text-[#F8FAFC] underline-offset-2 hover:underline"
                      >
                        {currentSong.artist}
                      </button>
                    ) : (
                      waitingArtist
                    )}
                  </p>
                  {currentSong?.producer && !isDropPlaying && (
                    <p className="mt-1 text-xs tracking-wide text-[#00E5FF]/55">
                      prod. {currentSong.producer}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-[#CBD5E1]/75">
                    {archivePlaybackMode
                      ? "FlowSoundz Continuous Mix — curated selection on air"
                      : archiveStandbyMode
                        ? "FlowSoundz — curated discovery while live rotation loads"
                      : maintenanceMode
                        ? "FlowSoundz Continuous Mix — live rotation coming up"
                        : isDropPlaying
                          ? "Station ident before the next record"
                          : currentSong?.album ?? "FlowSoundz station rotation"}
                  </p>
                </div>
                <span
                  className={`state-fade rounded-full px-3 py-1 text-xs font-semibold ${
                    archiveStandbyMode
                      ? "border border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
                      : maintenanceMode
                      ? "border border-amber-300/20 bg-amber-200/10 text-amber-100"
                      : isDropPlaying
                      ? "border border-[#FF2DA6]/20 bg-[#FF2DA6]/10 text-[#F8FAFC]"
                      : isPlaying
                        ? "border border-[#00E5FF]/20 bg-[#00E5FF]/10 text-[#F8FAFC]"
                        : "border border-white/8 bg-white/5 text-[#CBD5E1]"
                  }`}
                >
                    {archivePlaybackMode || archiveStandbyMode
                      ? "Mix"
                      : maintenanceMode
                      ? "Mix"
                      : isDropPlaying
                        ? "Drop"
                        : isPlaying
                          ? "Live"
                          : "Paused"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="state-fade rounded-full border border-[#8B5CF6]/18 bg-[#8B5CF6]/12 px-3 py-1 text-xs font-semibold text-[#F8FAFC]">
                  {formatVibeLabel(selectedVibe)}
                </span>
                {archivePlaybackMode || archiveStandbyMode || maintenanceMode ? (
                  <span className="state-fade rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100">
                    Continuous Mix
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
                  {archivePlaybackMode
                    ? "Continuous mix"
                    : archiveStandbyMode
                    ? "Curated select"
                    : maintenanceMode
                      ? "Continuous mix"
                      : isDropPlaying
                        ? `${songsUntilDrop} songs to next drop`
                        : currentSong?.genre ?? "After-hours mix"}
                </span>
                {currentSong && !isDropPlaying ? (
                  <button
                    type="button"
                    onClick={() => setShowArtistPanel(true)}
                    className="pointer-events-auto state-fade rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-medium text-[#CBD5E1] transition hover:border-[#00E5FF]/25 hover:text-[#F8FAFC]"
                  >
                    Artist Profile
                  </button>
                ) : null}
                {currentSong && !isDropPlaying && getLyrics(currentSong.id) ? (
                  <button
                    type="button"
                    onClick={() => setShowLyrics((v) => !v)}
                    className={`pointer-events-auto state-fade rounded-full border px-3 py-1 text-xs font-medium transition ${showLyrics ? "border-[#8B5CF6]/40 bg-[#8B5CF6]/15 text-[#c4b5fd]" : "border-white/8 bg-white/5 text-[#CBD5E1] hover:border-[#8B5CF6]/25 hover:text-[#F8FAFC]"}`}
                  >
                    {showLyrics ? "Hide Lyrics" : "Lyrics"}
                  </button>
                ) : null}
                {currentSong && !isDropPlaying && vibeBalance !== null ? (
                  <button
                    type="button"
                    onClick={() => void boostTrack(currentSong.id)}
                    className="pointer-events-auto state-fade flex items-center gap-1.5 rounded-full border border-[#00E5FF]/20 bg-[#00E5FF]/08 px-3 py-1 text-xs font-medium text-[#00E5FF] transition hover:bg-[#00E5FF]/15"
                    title="Spend 50 Vibe Points to boost this track"
                  >
                    ⚡ Boost · {vibeBalance} pts
                  </button>
                ) : null}
                {currentSong && !isDropPlaying ? (
                  <a
                    href={`https://open.spotify.com/search/${encodeURIComponent(`${currentSong.title} ${currentSong.artist}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto state-fade flex items-center gap-1.5 rounded-full border border-[#1DB954]/20 bg-[#1DB954]/10 px-3 py-1 text-xs font-medium text-[#1DB954] transition hover:bg-[#1DB954]/18 hover:text-white"
                  >
                    <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                    Spotify
                  </a>
                ) : null}
                {currentSong && !isDropPlaying ? (
                  <a
                    href={`https://music.apple.com/search?term=${encodeURIComponent(`${currentSong.title} ${currentSong.artist}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto state-fade flex items-center gap-1.5 rounded-full border border-[#fc3c44]/20 bg-[#fc3c44]/10 px-3 py-1 text-xs font-medium text-[#fc3c44] transition hover:bg-[#fc3c44]/18 hover:text-white"
                  >
                    <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current"><path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026C4.786.07 4.043.15 3.34.428 2.004.958 1.04 1.88.475 3.208a5.494 5.494 0 00-.39 1.554c-.06.562-.087 1.125-.09 1.69v11.1c.01.55.04 1.1.1 1.648.076.715.272 1.392.63 2.012.713 1.22 1.79 2.01 3.185 2.368.505.127 1.02.19 1.54.213.563.026 1.125.03 1.688.03h11.27c.563 0 1.126-.003 1.688-.03.62-.03 1.234-.107 1.826-.316 1.33-.47 2.286-1.37 2.87-2.65.278-.62.397-1.28.44-1.95.027-.43.037-.86.04-1.29V6.124zm-6.985 9.32c-.016.026-.037.05-.058.073a1.977 1.977 0 01-2.142.568 1.976 1.976 0 01-.817-.5L9.7 11.44a1.976 1.976 0 010-2.794l1.41-1.41a1.977 1.977 0 012.794 0l4.29 4.29a1.978 1.978 0 01.002 2.794l-1.187 1.124z"/></svg>
                    Apple Music
                  </a>
                ) : null}
                <span className="state-fade rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-medium text-[#CBD5E1]">
                  {archivePlaybackMode
                    ? currentSong?.duration_sec
                      ? `${Math.floor(currentSong.duration_sec / 60)}:${String(
                          currentSong.duration_sec % 60,
                        ).padStart(2, "0")}`
                      : "Archive session"
                    : archiveStandbyMode
                      ? "Preview mode"
                    : maintenanceMode
                      ? `Returns ${nextBroadcastTime}`
                      : currentSong?.duration_sec
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
                      style={{ width: `${maintenanceMode ? 100 : progressPercent}%`, opacity: maintenanceMode ? 0.38 : 1 }}
                    />
                    <div
                      className={`pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00e5ff] transition-all duration-200 ${isPlaying ? "shadow-[0_0_12px_rgba(0,229,255,1),0_0_28px_rgba(0,229,255,0.6)] scale-110" : "shadow-[0_0_8px_rgba(0,229,255,0.6)]"} ${maintenanceMode ? "opacity-0" : ""}`}
                      style={{ left: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-[#CBD5E1]">
                  <span>
                    {archiveStandbyMode ? "Continuous Mix" : maintenanceMode ? "Mix" : formatClock(currentTime)}
                  </span>
                  <span>
                    {archiveStandbyMode ? "Live rotation loading" : maintenanceMode ? nextBroadcastTime : formatClock(duration)}
                  </span>
                </div>
              </div>

              {showLyrics && currentSong && getLyrics(currentSong.id) ? (
                <div className="state-fade rounded-[1.4rem] border border-[#8B5CF6]/18 bg-[linear-gradient(160deg,rgba(139,92,246,0.07)_0%,rgba(0,229,255,0.04)_100%)] px-5 py-4 max-h-72 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8B5CF6]/70">
                    Lyrics — {currentSong.title}
                  </p>
                  <div className="space-y-3 text-sm leading-7 text-[#CBD5E1]/90 whitespace-pre-line">
                    {getLyrics(currentSong.id)}
                  </div>
                </div>
              ) : null}

              {maintenanceMode || archivePlaybackMode ? (
                <div
                  className={`rounded-[1.15rem] px-4 py-3 ${
                    archivePlaybackMode || archiveStandbyMode
                      ? "border border-cyan-300/14 bg-cyan-300/[0.06]"
                      : "border border-amber-300/16 bg-amber-200/[0.06]"
                  }`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/75">
                    FlowSoundz Continuous Mix
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-200">
                    {archivePlaybackMode
                      ? "Curated selection is on air. Featured artists and tracks stay playable — the live rotation picks back up automatically."
                      : archiveStandbyMode
                      ? "Explore the curated catalog and artist profiles. The live rotation is coming up next."
                      : "The live rotation is syncing. Browse artist profiles or the catalog while Continuous Mix keeps the station on air."}
                  </p>
                </div>
              ) : null}

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
                  {archivePlaybackMode
                    ? isPlaying
                      ? "Pause"
                      : "Play Archive"
                    : archiveStandbyMode
                      ? "Open Artist Profile"
                    : maintenanceMode
                      ? "Broadcast offline"
                      : isPlaying
                        ? "Pause"
                        : "Play"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (archivePlaybackMode || archiveStandbyMode) {
                      window.location.href = "/songs";
                      return;
                    }
                    void skipToNextTrack();
                  }}
                  disabled={queue.length === 0 || !!error || isDropPlaying}
                  className="min-h-16 rounded-full border border-white/8 bg-[#111827] px-6 text-base font-semibold text-[#F8FAFC] transition hover:border-white/12 hover:bg-[#111827]/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {archivePlaybackMode || archiveStandbyMode ? "Browse Catalog" : "Next Track"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const song = currentSong;
                    const title = song?.title;
                    const artist = song?.artist;
                    const url = song?.id
                      ? `${window.location.origin}/radio?song=${song.id}`
                      : `${window.location.origin}/radio`;
                    const shareText = title && artist
                      ? `Listening to "${title}" by ${artist} on FlowSoundz Radio`
                      : `Live on FlowSoundz Radio`;
                    track("share_track_click", { title: title ?? null, artist: artist ?? null });

                    // Award Vibe Points for sharing (fire-and-forget)
                    void fetch("/api/share/award", { method: "POST" }).then(async (res) => {
                      if (res.ok) {
                        const data = (await res.json()) as { ok: boolean; balance: number | null };
                        if (data.ok && data.balance !== null) {
                          setShareCopied(true);
                          setTimeout(() => setShareCopied(false), 2500);
                        }
                      }
                    });

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
                  title="Share — earn 25 Vibe Points"
                >
                  {shareCopied ? (
                    <span className="flex items-center gap-2 text-[#00e5ff]">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      +25 pts
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

          <div className="mt-4 space-y-3 lg:max-h-[34rem] lg:overflow-y-auto lg:pr-1">
            {isLoading ? (
              <>
                <div className="h-20 animate-pulse rounded-[1.4rem] bg-white/6" />
                <div className="h-20 animate-pulse rounded-[1.4rem] bg-white/6" />
                <div className="h-20 animate-pulse rounded-[1.4rem] bg-white/6" />
              </>
            ) : error ? (
              <div className="rounded-[1.3rem] border border-cyan-300/18 bg-cyan-300/[0.06] px-4 py-4 text-sm text-[#F8FAFC]">
                <p className="font-semibold text-cyan-100">FlowSoundz Continuous Mix</p>
                <p className="mt-2 leading-6 text-slate-200">{error}</p>
                <div className="mt-3 rounded-[1rem] border border-white/8 bg-black/20 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/75">
                    Live rotation
                  </p>
                  <p className="mt-1 text-sm text-white">Back online around {nextBroadcastTime}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    Browse the catalog and artist profiles while the live rotation syncs up.
                  </p>
                </div>
                {standbyArchiveSongs.length > 0 ? (
                  <div className="mt-4 grid gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200/75">
                      Featured archive
                    </p>
                    {standbyArchiveSongs.map((song) => (
                      <div
                        key={song.id}
                        className="flex items-center justify-between gap-3 rounded-[1rem] border border-white/8 bg-black/20 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{song.title}</p>
                          <p className="truncate text-xs text-slate-300">{song.artist}</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-white/8 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-[#CBD5E1]">
                          {formatVibeLabel(song.vibe ?? selectedVibe)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
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
        {upcomingSongsPreview.length > 0 && (
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#CBD5E1]/55">
                Coming up this hour
              </p>
              <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-medium text-[#CBD5E1]">
                {upcomingSongsPreview.length} tracks
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2">
              {upcomingSongsPreview.map((song, i) => (
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

      {showArtistPanel && currentArtistProfile && (
        <ArtistQuickPanel
          artist={currentArtistProfile}
          onClose={() => setShowArtistPanel(false)}
        />
      )}

      {showChat && (
        <LiveChat
          currentTrackTitle={currentSong?.title ?? null}
          onClose={() => setShowChat(false)}
        />
      )}
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
