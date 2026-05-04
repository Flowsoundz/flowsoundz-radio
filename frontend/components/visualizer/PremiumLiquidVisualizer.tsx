"use client";

import Image from "next/image";
import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { AudioUploader } from "@/components/visualizer/AudioUploader";
import { StylePicker } from "@/components/visualizer/StylePicker";
import { playTrack } from "@/lib/playbackController";
import {
  analyzeFrequencyData,
  createIdleAudioMetrics,
  mixAudioMetrics,
  type AudioMetrics,
} from "@/lib/audioAnalysis";
import {
  getVisualizerPreset,
  type VisualizerPresetId,
} from "@/lib/visualizerPresets";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hueShift: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3
    ? normalized
        .split("")
        .map((char) => char + char)
        .join("")
    : normalized;

  const red = Number.parseInt(full.slice(0, 2), 16);
  const green = Number.parseInt(full.slice(2, 4), 16);
  const blue = Number.parseInt(full.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  metrics: AudioMetrics,
  preset: ReturnType<typeof getVisualizerPreset>,
  reducedMotion: boolean,
) {
  ctx.clearRect(0, 0, width, height);

  const base = ctx.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, "#040816");
  base.addColorStop(0.55, "#02050f");
  base.addColorStop(1, "#01030a");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  const drift = reducedMotion ? 0.12 : 0.4;
  const leftGlowX = width * (0.22 + Math.sin(time * drift) * 0.03);
  const rightGlowX = width * (0.78 + Math.cos(time * drift * 0.82) * 0.04);
  const topGlowY = height * (0.22 + Math.sin(time * drift * 0.74) * 0.03);

  const leftGlow = ctx.createRadialGradient(leftGlowX, topGlowY, 0, leftGlowX, topGlowY, width * 0.32);
  leftGlow.addColorStop(0, hexToRgba(preset.accentA, 0.11 + metrics.mids * 0.12));
  leftGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = leftGlow;
  ctx.fillRect(0, 0, width, height);

  const rightGlow = ctx.createRadialGradient(
    rightGlowX,
    height * (0.24 + Math.cos(time * drift * 0.66) * 0.05),
    0,
    rightGlowX,
    height * 0.24,
    width * 0.3,
  );
  rightGlow.addColorStop(0, hexToRgba(preset.accentD, 0.1 + metrics.highs * 0.12));
  rightGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rightGlow;
  ctx.fillRect(0, 0, width, height);

  const liquidLayers = [
    {
      offset: -height * 0.02,
      thickness: height * 0.16,
      amplitude: height * (0.085 + metrics.bass * 0.05),
      blur: 18,
      alpha: 0.3,
      colorA: preset.accentB,
      colorB: preset.accentA,
      speed: preset.waveSpeed * 0.74,
    },
    {
      offset: height * 0.02,
      thickness: height * 0.2,
      amplitude: height * (0.105 + metrics.mids * 0.08),
      blur: 22,
      alpha: 0.38,
      colorA: preset.energy,
      colorB: preset.accentD,
      speed: preset.waveSpeed * 1.02,
    },
  ];

  for (const layer of liquidLayers) {
    const gradient = ctx.createLinearGradient(0, height * 0.5, width, height * 0.5);
    gradient.addColorStop(0, hexToRgba(layer.colorA, layer.alpha * 0.88));
    gradient.addColorStop(0.22, hexToRgba("#ffffff", layer.alpha * 0.3));
    gradient.addColorStop(0.5, hexToRgba("#f8fbff", layer.alpha * 0.52));
    gradient.addColorStop(0.78, hexToRgba(layer.colorB, layer.alpha * 0.86));
    gradient.addColorStop(1, hexToRgba(layer.colorB, layer.alpha * 0.64));

    const centerY =
      height * 0.52 +
      layer.offset +
      Math.sin(time * layer.speed * (reducedMotion ? 0.35 : 1)) * height * 0.018;
    const steps = 36;

    ctx.save();
    ctx.beginPath();
    for (let index = 0; index <= steps; index += 1) {
      const t = index / steps;
      const x = width * t;
      const wave =
        Math.sin(t * Math.PI * 3 + time * layer.speed) * layer.amplitude +
        Math.cos(t * Math.PI * 5 - time * layer.speed * 0.82) * layer.amplitude * 0.42;
      const y = centerY + wave;

      if (index === 0) {
        ctx.moveTo(x, y - layer.thickness);
      } else {
        ctx.lineTo(x, y - layer.thickness);
      }
    }

    for (let index = steps; index >= 0; index -= 1) {
      const t = index / steps;
      const x = width * t;
      const wave =
        Math.sin(t * Math.PI * 3 + time * layer.speed) * layer.amplitude +
        Math.cos(t * Math.PI * 5 - time * layer.speed * 0.82) * layer.amplitude * 0.42;
      const y = centerY + wave;
      ctx.lineTo(x, y + layer.thickness);
    }

    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.shadowBlur = layer.blur;
    ctx.shadowColor = layer.colorA;
    ctx.fill();

    const highlight = new Path2D();
    for (let index = 0; index <= steps; index += 1) {
      const t = index / steps;
      const x = width * t;
      const wave =
        Math.sin(t * Math.PI * 3 + time * layer.speed) * layer.amplitude +
        Math.cos(t * Math.PI * 5 - time * layer.speed * 0.82) * layer.amplitude * 0.42;
      const y = centerY + wave - layer.thickness * 0.28;

      if (index === 0) {
        highlight.moveTo(x, y);
      } else {
        highlight.lineTo(x, y);
      }
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = hexToRgba("#ffffff", 0.12 + metrics.presence * 0.2);
    ctx.lineWidth = 1.2 + metrics.highs * 1.6;
    ctx.shadowColor = "#dff6ff";
    ctx.shadowBlur = 16 + metrics.volume * 16;
    ctx.stroke(highlight);
    ctx.restore();
  }

  const collision = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, height * 0.36);
  collision.addColorStop(0, hexToRgba("#ffffff", 0.16 + metrics.volume * 0.18));
  collision.addColorStop(0.12, hexToRgba(preset.glowCore, 0.2 + metrics.bass * 0.24));
  collision.addColorStop(0.32, hexToRgba(preset.energy, 0.18 + metrics.mids * 0.18));
  collision.addColorStop(0.52, hexToRgba(preset.glowOuter, 0.12 + metrics.mids * 0.14));
  collision.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = collision;
  ctx.fillRect(width * 0.12, height * 0.08, width * 0.76, height * 0.84);
  ctx.globalCompositeOperation = "source-over";

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.beginPath();
  ctx.ellipse(width * 0.5, height * 0.52, width * 0.09, height * 0.19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const vignette = ctx.createRadialGradient(width * 0.5, height * 0.5, height * 0.12, width * 0.5, height * 0.5, width * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(1,2,10,0.78)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

function drawWaveformLine(
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
  metrics: AudioMetrics,
  time: number,
  color: string,
  invert = false,
) {
  const steps = 48;
  ctx.save();
  ctx.beginPath();
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const x = width * t;
    const wave =
      Math.sin(t * Math.PI * 4 + time * 1.8) * (8 + metrics.highs * 12) +
      Math.cos(t * Math.PI * 9 - time * 1.2) * (3 + metrics.mids * 8);
    const pointY = y + (invert ? -wave : wave);
    if (index === 0) {
      ctx.moveTo(x, pointY);
    } else {
      ctx.lineTo(x, pointY);
    }
  }
  ctx.strokeStyle = hexToRgba(color, 0.24);
  ctx.lineWidth = 1.2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.stroke();
  ctx.restore();
}

function updateParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  width: number,
  height: number,
  metrics: AudioMetrics,
  preset: ReturnType<typeof getVisualizerPreset>,
  reducedMotion: boolean,
  isMobile: boolean,
) {
  const targetCount = Math.round(
    (isMobile ? 16 : 34) * preset.particleDensity * (reducedMotion ? 0.4 : 1),
  );

  if (particles.length < targetCount && metrics.highs > 0.1) {
    const spawnCount = Math.min(
      targetCount - particles.length,
      Math.max(1, Math.round(metrics.highs * (isMobile ? 2 : 5))),
    );
    for (let index = 0; index < spawnCount; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.4 + Math.random() * 1.8) * (0.6 + metrics.highs * 1.4);
      particles.push({
        x: width * 0.5 + Math.cos(angle) * width * 0.05,
        y: height * 0.5 + Math.sin(angle) * height * 0.07,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 32 + Math.random() * 40,
        size: 1.2 + Math.random() * (isMobile ? 1.4 : 2.4),
        hueShift: Math.random(),
      });
    }
  }

  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index]!;
    particle.life += 1;
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vx *= 0.986;
    particle.vy *= 0.986;
    particle.vy += 0.006;

    if (
      particle.life >= particle.maxLife ||
      particle.x < -20 ||
      particle.x > width + 20 ||
      particle.y < -20 ||
      particle.y > height + 20
    ) {
      particles.splice(index, 1);
      continue;
    }

    const progress = 1 - particle.life / particle.maxLife;
    const color =
      particle.hueShift > 0.66
        ? preset.accentD
        : particle.hueShift > 0.33
          ? preset.accentB
          : preset.accentA;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = hexToRgba(color, progress * 0.8);
    ctx.shadowColor = color;
    ctx.shadowBlur = 10 + particle.size * 4;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size * 3.2);
    ctx.restore();
  }
}

function drawForeground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  metrics: AudioMetrics,
  preset: ReturnType<typeof getVisualizerPreset>,
  artistName: string,
  particles: Particle[],
  reducedMotion: boolean,
  isMobile: boolean,
) {
  ctx.clearRect(0, 0, width, height);

  const centerX = width * 0.5;
  const centerY = height * 0.52;
  const pulseRadius = height * (0.1 + metrics.bass * 0.12);
  const pulse = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseRadius * 2.4);
  pulse.addColorStop(0, hexToRgba("#ffffff", 0.36 + metrics.volume * 0.24));
  pulse.addColorStop(0.16, hexToRgba(preset.glowCore, 0.32 + metrics.bass * 0.28));
  pulse.addColorStop(0.5, hexToRgba(preset.energy, 0.18 + metrics.mids * 0.22));
  pulse.addColorStop(1, "rgba(0,0,0,0)");

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = pulse;
  ctx.fillRect(centerX - pulseRadius * 2.4, centerY - pulseRadius * 2.4, pulseRadius * 4.8, pulseRadius * 4.8);
  ctx.restore();

  const rippleCount = reducedMotion ? 2 : 4;
  for (let index = 0; index < rippleCount; index += 1) {
    const progress = index / rippleCount;
    const radius = height * (0.12 + progress * 0.16) + metrics.mids * 28;
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(
      index % 2 === 0 ? preset.accentA : preset.accentD,
      0.12 + (1 - progress) * 0.18 + metrics.highs * 0.08,
    );
    ctx.lineWidth = 1.2 + progress * 0.8;
    ctx.shadowColor = preset.energy;
    ctx.shadowBlur = 12 + metrics.mids * 16;
    ctx.stroke();
    ctx.restore();
  }

  drawWaveformLine(ctx, width, height * 0.24, metrics, time, preset.accentA);
  drawWaveformLine(ctx, width, height * 0.8, metrics, time, preset.accentD, true);

  for (let index = 0; index < 3; index += 1) {
    const radius = height * (0.14 + index * 0.09) + metrics.volume * 18;
    const start = time * 0.2 + index;
    const end = start + Math.PI * (1.2 + metrics.highs * 0.6);
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, start, end);
    ctx.strokeStyle = hexToRgba(index === 1 ? preset.accentC : preset.ring, 0.18 + metrics.volume * 0.18);
    ctx.lineWidth = 1.4;
    ctx.shadowColor = preset.ring;
    ctx.shadowBlur = 18;
    ctx.stroke();
    ctx.restore();
  }

  updateParticles(ctx, particles, width, height, metrics, preset, reducedMotion, isMobile);

  const label = artistName.trim() || "FlowSoundz Radio";
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = preset.glowCore;
  ctx.shadowBlur = 12 + metrics.volume * 26;
  ctx.fillStyle = "rgba(246, 250, 255, 0.94)";
  ctx.font = `700 ${Math.max(24, width * 0.044)}px var(--font-display), system-ui, sans-serif`;
  ctx.fillText(label, centerX, height * 0.47);

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(153, 171, 196, 0.76)";
  ctx.font = `600 ${Math.max(10, width * 0.0115)}px var(--font-sans), system-ui, sans-serif`;
  ctx.fillText(preset.hudLabel.toUpperCase(), centerX, height * 0.47 + 28);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(width * 0.14, centerY);
  ctx.lineTo(width * 0.35, centerY);
  ctx.moveTo(width * 0.65, centerY);
  ctx.lineTo(width * 0.86, centerY);
  ctx.stroke();
  ctx.restore();
}

export function PremiumLiquidVisualizer() {
  const artistInputId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const smoothedMetricsRef = useRef<AudioMetrics>({
    bass: 0.18,
    mids: 0.24,
    highs: 0.2,
    volume: 0.22,
    presence: 0.2,
  });
  const reducedMotionRef = useRef(false);
  const mobileRef = useRef(false);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [artistName, setArtistName] = useState("FlowSoundz Radio");
  const [presetId, setPresetId] = useState<VisualizerPresetId>("mercury-core");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [trackLabel, setTrackLabel] = useState("Idle preview");
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const preset = getVisualizerPreset(presetId);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.crossOrigin = "anonymous";

    const handleEnded = () => {
      setIsPlaying(false);
      setTrackLabel("Playback ended");
    };

    const handlePause = () => {
      if (audio.currentTime > 0 && !audio.ended) {
        setTrackLabel("Paused");
      }
    };

    const handlePlay = () => {
      setTrackLabel("Audio-reactive preview running");
    };

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("play", handlePlay);
    audioRef.current = audio;

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      resizeObserverRef.current?.disconnect();
      audio.pause();
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("play", handlePlay);
      audio.src = "";
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      audioContextRef.current?.close().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReducedMotion = () => {
      reducedMotionRef.current = mediaQuery.matches;
      setIsReducedMotion(mediaQuery.matches);
    };

    const syncViewport = () => {
      mobileRef.current = window.innerWidth < 768;
      setIsMobileViewport(window.innerWidth < 768);
    };

    syncReducedMotion();
    syncViewport();
    mediaQuery.addEventListener("change", syncReducedMotion);
    window.addEventListener("resize", syncViewport);

    return () => {
      mediaQuery.removeEventListener("change", syncReducedMotion);
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setPlaybackError(null);
    setIsPlaying(false);
    particlesRef.current = [];
    smoothedMetricsRef.current = createIdleAudioMetrics(0, preset.motion);

    if (!audioFile) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      return;
    }

    const objectUrl = URL.createObjectURL(audioFile);
    objectUrlRef.current = objectUrl;
    audio.pause();
    audio.src = objectUrl;
    audio.load();
  }, [audioFile, preset.motion]);

  useEffect(() => {
    const container = containerRef.current;
    const backgroundCanvas = backgroundCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!container || !backgroundCanvas || !overlayCanvas) return;

    const backgroundContext = backgroundCanvas.getContext("2d");
    const overlayContext = overlayCanvas.getContext("2d");
    if (!backgroundContext || !overlayContext) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = clamp(
        window.devicePixelRatio || 1,
        1,
        mobileRef.current ? 1.5 : 2,
      );

      for (const canvas of [backgroundCanvas, overlayCanvas]) {
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }

      backgroundContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      overlayContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const observer = new ResizeObserver(() => resize());
    observer.observe(container);
    resizeObserverRef.current = observer;

    const start = performance.now();

    const renderFrame = (now: number) => {
      const elapsed = (now - start) / 1000;
      const rect = container.getBoundingClientRect();
      const audio = audioRef.current;
      const analyser = analyserRef.current;
      const audioContext = audioContextRef.current;

      const hasLiveAudio =
        Boolean(audio && !audio.paused && !audio.ended && analyser && audioContext);

      let targetMetrics = createIdleAudioMetrics(elapsed, preset.motion);
      if (hasLiveAudio && analyser && audioContext) {
        const frequencyData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(frequencyData);
        targetMetrics = analyzeFrequencyData(
          frequencyData,
          audioContext.sampleRate,
          analyser.fftSize,
        );
      }

      smoothedMetricsRef.current = mixAudioMetrics(
        smoothedMetricsRef.current,
        targetMetrics,
        reducedMotionRef.current ? 0.08 : 0.14,
      );

      drawBackdrop(
        backgroundContext,
        rect.width,
        rect.height,
        elapsed,
        smoothedMetricsRef.current,
        preset,
        reducedMotionRef.current,
      );

      drawForeground(
        overlayContext,
        rect.width,
        rect.height,
        elapsed,
        smoothedMetricsRef.current,
        preset,
        artistName,
        particlesRef.current,
        reducedMotionRef.current,
        mobileRef.current,
      );

      rafRef.current = window.requestAnimationFrame(renderFrame);
    };

    const resume = () => {
      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(renderFrame);
      }
    };

    const pause = () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        pause();
      } else {
        resume();
      }
    };

    resume();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      pause();
      document.removeEventListener("visibilitychange", handleVisibility);
      observer.disconnect();
    };
  }, [artistName, preset]);

  const ensureAudioContext = async () => {
    const audio = audioRef.current;
    if (!audio) return null;

    let audioContext = audioContextRef.current;
    if (!audioContext) {
      audioContext = new window.AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.82;
      const source = audioContext.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    return audioContext;
  };

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio || !audioFile) return;

    setPlaybackError(null);

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await ensureAudioContext();
      await playTrack(audioRef, {
        id: objectUrlRef.current ?? audioFile.name,
        src: audio.currentSrc || audio.src,
      });
      setIsPlaying(true);
    } catch (error) {
      setPlaybackError("Playback could not start. Try pressing play again after selecting your file.");
      setTrackLabel("Playback blocked");
      console.error("[VisualizerStudio] Audio playback failed", error);
    }
  };

  const clearAudio = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setAudioFile(null);
    setPlaybackError(null);
    setTrackLabel("Idle preview");
  };

  return (
    <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-5">
        <AudioUploader
          file={audioFile}
          onFileChange={(file) => {
            setAudioFile(file);
            setTrackLabel(file ? `Loaded ${file.name}` : "Idle preview");
          }}
          onClear={clearAudio}
        />

        <div className="glass-card rounded-[1.75rem] border border-white/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/70">
            Artist Display
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">Center title glow</h2>
          <label htmlFor={artistInputId} className="mt-4 block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              Artist name
            </span>
            <input
              id={artistInputId}
              value={artistName}
              onChange={(event) => setArtistName(event.target.value)}
              placeholder="Enter artist name"
              className="w-full rounded-[1.15rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/35 focus:bg-cyan-300/[0.03]"
            />
          </label>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            The center label and glow intensity react to overall audio energy. Leave it blank to fall back to the FlowSoundz title.
          </p>
        </div>

        <StylePicker value={presetId} onChange={setPresetId} />

        <div className="glass-card rounded-[1.75rem] border border-white/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/70">
            Playback
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void togglePlayback()}
              disabled={!audioFile}
              className={`inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-semibold transition ${
                audioFile
                  ? "bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_46%,#ff9f1c_100%)] text-slate-950 shadow-[0_0_32px_rgba(0,229,255,0.2)] hover:scale-[1.01]"
                  : "cursor-not-allowed border border-white/10 bg-white/[0.05] text-slate-500"
              }`}
            >
              {isPlaying ? "Pause preview" : "Play preview"}
            </button>
            <span className="text-sm text-slate-300">
              {audioFile
                ? "AudioContext starts only after your play press."
                : "Upload a song to unlock the live preview."}
            </span>
          </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                {trackLabel}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                {isMobileViewport ? "Mobile-optimized" : "Desktop detail"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                {isReducedMotion ? "Reduced motion" : "Full motion"}
              </span>
            </div>
          {playbackError ? (
            <p className="mt-3 text-sm leading-6 text-rose-200">{playbackError}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-5">
        <div className="glass-card overflow-hidden rounded-[1.9rem] border border-white/10 p-3">
          <div
            ref={containerRef}
            className="relative h-[240px] overflow-hidden rounded-[1.45rem] border border-white/8 bg-[#050816] md:h-[360px]"
            style={{
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px rgba(255,255,255,0.02), 0 40px 120px rgba(0,0,0,0.42), 0 0 80px ${hexToRgba(preset.glowOuter, 0.12)}`,
            }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04),transparent_44%),linear-gradient(135deg,rgba(0,229,255,0.05),transparent_32%,rgba(255,61,242,0.04)_68%,transparent_100%)]" />
            <canvas ref={backgroundCanvasRef} className="absolute inset-0 h-full w-full" />
            <canvas ref={overlayCanvasRef} className="absolute inset-0 h-full w-full" />

            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <div className="translate-y-[-18%] opacity-80">
                <Image
                  src="/FSRLogo.svg"
                  alt="FlowSoundz Radio"
                  width={220}
                  height={72}
                  priority
                  className="h-auto w-[clamp(130px,18vw,220px)] drop-shadow-[0_0_18px_rgba(0,229,255,0.25)]"
                />
              </div>
            </div>

            <div className="pointer-events-none absolute inset-x-4 top-4 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-300/70 md:inset-x-6">
              <span>FlowSoundz Studio</span>
              <span>{preset.name}</span>
            </div>

            <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 md:inset-x-6">
              <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-200/85 backdrop-blur-md">
                Bass pulse / mids ripple / highs sparks
              </div>
              <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-200/85 backdrop-blur-md">
                Local browser render
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="glass-card rounded-[1.45rem] border border-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/70">
              Liquid layer
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Layered gradients and ribbon waves fake a reflective mercury field without video assets or Three.js.
            </p>
          </div>
          <div className="glass-card rounded-[1.45rem] border border-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/70">
              Audio response
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Bass drives the center core, mids spread ring ripples, and highs emit compact sparks and HUD traces.
            </p>
          </div>
          <div className="glass-card rounded-[1.45rem] border border-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/70">
              Safe scope
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Everything runs only under the `/visualizer` route with no backend, auth, payments, or player-queue changes.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
