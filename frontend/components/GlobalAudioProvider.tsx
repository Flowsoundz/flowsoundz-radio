"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { resetPlaybackController } from "@/lib/playbackController";

type GlobalAudioContextValue = {
  audioRef: MutableRefObject<HTMLAudioElement | null>;
  analyserRef: MutableRefObject<AnalyserNode | null>;
  dataArrayRef: MutableRefObject<Uint8Array<ArrayBuffer> | null>;
  audioContextRef: MutableRefObject<AudioContext | null>;
  togglePlaybackRef: MutableRefObject<(() => void) | null>;
  skipTrackRef: MutableRefObject<(() => Promise<void> | void) | null>;
  setCurrentTrack: (
    track: {
      id: string;
      src: string;
      title: string;
      artist: string;
    } | null,
  ) => void;
  isReady: boolean;
  isPlaying: boolean;
  hasStartedPlayback: boolean;
  currentTrack: {
    id: string;
    src: string;
    title: string;
    artist: string;
  } | null;
};

type GlobalAudioRefsContextValue = {
  audioRef: MutableRefObject<HTMLAudioElement | null>;
  analyserRef: MutableRefObject<AnalyserNode | null>;
  dataArrayRef: MutableRefObject<Uint8Array<ArrayBuffer> | null>;
  audioContextRef: MutableRefObject<AudioContext | null>;
  togglePlaybackRef: MutableRefObject<(() => void) | null>;
  skipTrackRef: MutableRefObject<(() => Promise<void> | void) | null>;
  setCurrentTrack: (
    track: {
      id: string;
      src: string;
      title: string;
      artist: string;
    } | null,
  ) => void;
};

type GlobalAudioStateContextValue = {
  isReady: boolean;
  isPlaying: boolean;
  hasStartedPlayback: boolean;
  currentTrack: {
    id: string;
    src: string;
    title: string;
    artist: string;
  } | null;
};

const AudioRefsContextGlobal = createContext<GlobalAudioRefsContextValue | null>(null);
const AudioStateContextGlobal = createContext<GlobalAudioStateContextValue | null>(null);

export function GlobalAudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const togglePlaybackRef = useRef<(() => void) | null>(null);
  const skipTrackRef = useRef<(() => Promise<void> | void) | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStartedPlayback, setHasStartedPlayback] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<{
    id: string;
    src: string;
    title: string;
    artist: string;
  } | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "metadata";
    let readyTimer: number | null = null;
    const syncPlaybackState = () => {
      if (!audio.paused && audioContextRef.current?.state === "suspended") {
        void audioContextRef.current.resume().catch(() => undefined);
      }
      if (!audio.paused && !audio.ended) {
        setHasStartedPlayback(true);
      }
      setIsPlaying(!audio.paused && !audio.ended);
    };
    const handleEnded = () => {
      syncPlaybackState();
      resetPlaybackController();
    };
    const handleEmptied = () => {
      syncPlaybackState();
      resetPlaybackController();
    };

    audio.addEventListener("play", syncPlaybackState);
    audio.addEventListener("pause", syncPlaybackState);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("emptied", handleEmptied);

    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      audioRef.current = audio;
      readyTimer = window.setTimeout(() => setIsReady(true), 0);
      return () => {
        if (readyTimer !== null) {
          window.clearTimeout(readyTimer);
        }
        audio.removeEventListener("play", syncPlaybackState);
        audio.removeEventListener("pause", syncPlaybackState);
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("emptied", handleEmptied);
        audio.pause();
        audio.src = "";
        resetPlaybackController();
        audioRef.current = null;
      };
    }

    const context = new AudioContextCtor();
    const source = context.createMediaElementSource(audio);
    const analyser = context.createAnalyser();

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.78;

    // Soft limiter — prevents clipping from hot masters without squashing dynamics
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-14, context.currentTime);
    compressor.knee.setValueAtTime(12, context.currentTime);
    compressor.ratio.setValueAtTime(8, context.currentTime);
    compressor.attack.setValueAtTime(0.003, context.currentTime);
    compressor.release.setValueAtTime(0.15, context.currentTime);

    source.connect(analyser);
    analyser.connect(compressor);
    compressor.connect(context.destination);

    audioRef.current = audio;
    analyserRef.current = analyser;
    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
    audioContextRef.current = context;
    readyTimer = window.setTimeout(() => setIsReady(true), 0);

    return () => {
      if (readyTimer !== null) {
        window.clearTimeout(readyTimer);
      }
      audio.removeEventListener("play", syncPlaybackState);
      audio.removeEventListener("pause", syncPlaybackState);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("emptied", handleEmptied);
      audio.pause();
      audio.src = "";
      resetPlaybackController();
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        void audioContextRef.current.close();
      }
      audioRef.current = null;
      analyserRef.current = null;
      dataArrayRef.current = null;
      audioContextRef.current = null;
    };
  }, []);

  const refsValue = useMemo<GlobalAudioRefsContextValue>(
    () => ({
      audioRef,
      analyserRef,
      dataArrayRef,
      audioContextRef,
      togglePlaybackRef,
      skipTrackRef,
      setCurrentTrack,
    }),
    [],
  );

  const stateValue = useMemo<GlobalAudioStateContextValue>(
    () => ({
      isReady,
      isPlaying,
      hasStartedPlayback,
      currentTrack,
    }),
    [currentTrack, hasStartedPlayback, isPlaying, isReady],
  );

  return (
    <AudioRefsContextGlobal.Provider value={refsValue}>
      <AudioStateContextGlobal.Provider value={stateValue}>
        {children}
      </AudioStateContextGlobal.Provider>
    </AudioRefsContextGlobal.Provider>
  );
}

export function useGlobalAudio() {
  const refs = useContext(AudioRefsContextGlobal);
  const state = useContext(AudioStateContextGlobal);
  if (!refs || !state) {
    throw new Error("useGlobalAudio must be used inside GlobalAudioProvider");
  }
  return {
    ...refs,
    ...state,
  } satisfies GlobalAudioContextValue;
}

export function useGlobalAudioRefs() {
  const context = useContext(AudioRefsContextGlobal);
  if (!context) {
    throw new Error("useGlobalAudioRefs must be used inside GlobalAudioProvider");
  }
  return context;
}

export function useGlobalAudioState() {
  const context = useContext(AudioStateContextGlobal);
  if (!context) {
    throw new Error("useGlobalAudioState must be used inside GlobalAudioProvider");
  }
  return context;
}
