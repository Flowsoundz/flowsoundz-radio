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
  isReady: boolean;
  isPlaying: boolean;
  hasStartedPlayback: boolean;
  currentTrack: {
    id: string;
    src: string;
    title: string;
    artist: string;
  } | null;
  setCurrentTrack: (
    track: {
      id: string;
      src: string;
      title: string;
      artist: string;
    } | null,
  ) => void;
  togglePlaybackRef: MutableRefObject<(() => void) | null>;
  skipTrackRef: MutableRefObject<(() => Promise<void> | void) | null>;
};

const AudioContextGlobal = createContext<GlobalAudioContextValue | null>(null);

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

  const value = useMemo<GlobalAudioContextValue>(
    () => ({
      audioRef,
      analyserRef,
      dataArrayRef,
      audioContextRef,
      isReady,
      isPlaying,
      hasStartedPlayback,
      currentTrack,
      setCurrentTrack,
      togglePlaybackRef,
      skipTrackRef,
    }),
    [currentTrack, hasStartedPlayback, isPlaying, isReady],
  );

  return (
    <AudioContextGlobal.Provider value={value}>
      {children}
    </AudioContextGlobal.Provider>
  );
}

export function useGlobalAudio() {
  const context = useContext(AudioContextGlobal);
  if (!context) {
    throw new Error("useGlobalAudio must be used inside GlobalAudioProvider");
  }
  return context;
}
