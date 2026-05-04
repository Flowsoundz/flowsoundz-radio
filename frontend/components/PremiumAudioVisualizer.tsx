"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type WaveLayer = {
  baseline: number;
  amplitude: number;
  frequency: number;
  speed: number;
  phase: number;
  thickness: number;
  opacity: number;
};

type DriftParticle = {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
};

type SparkParticle = {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  color: string;
};

type RingBurst = {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  color: string;
  thickness: number;
};

type Props = {
  analyser?: AnalyserNode | null;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  isPlaying?: boolean;
  className?: string;
  fullHeight?: boolean;
  showFrame?: boolean;
  showLogo?: boolean;
};

// ─── Palette ──────────────────────────────────────────────────────────────────

const LEFT_CORE       = "#00e5ff";
const LEFT_OUTER      = "#2e6bff";
const LEFT_MIST       = "#dff9ff";
const RIGHT_CORE      = "#ff3df2";
const RIGHT_OUTER     = "#7c4dff";
const RIGHT_WARM      = "#ff9f1c";
const CENTER_WHITE    = "#f7d9ff";
const SPARK_COLORS    = [LEFT_CORE, RIGHT_CORE, RIGHT_OUTER, RIGHT_WARM, LEFT_MIST];

// ─── Wave definitions ─────────────────────────────────────────────────────────

const LEFT_LAYERS: WaveLayer[] = [
  { baseline: 0.74, amplitude: 0.20, frequency: 0.62, speed:  0.06, phase: Math.PI * 0.55, thickness: 0.38, opacity: 0.36 },
  { baseline: 0.66, amplitude: 0.15, frequency: 1.0,  speed:  0.12, phase: 0,              thickness: 0.28, opacity: 0.52 },
  { baseline: 0.57, amplitude: 0.11, frequency: 1.62, speed:  0.19, phase: Math.PI * 0.4,  thickness: 0.20, opacity: 0.68 },
  { baseline: 0.49, amplitude: 0.08, frequency: 2.41, speed:  0.28, phase: Math.PI * 0.92, thickness: 0.14, opacity: 0.85 },
];

const RIGHT_LAYERS: WaveLayer[] = [
  { baseline: 0.75, amplitude: 0.20, frequency: 0.59, speed: -0.05, phase: Math.PI * 0.88, thickness: 0.38, opacity: 0.36 },
  { baseline: 0.67, amplitude: 0.15, frequency: 1.0,  speed: -0.10, phase: Math.PI * 0.22, thickness: 0.28, opacity: 0.52 },
  { baseline: 0.58, amplitude: 0.11, frequency: 1.52, speed: -0.18, phase: Math.PI * 0.78, thickness: 0.20, opacity: 0.68 },
  { baseline: 0.50, amplitude: 0.08, frequency: 2.30, speed: -0.27, phase: Math.PI * 1.28, thickness: 0.14, opacity: 0.85 },
];

const MAX_DRIFT      = 36;
const MAX_SPARKS     = 60;
const MAX_RINGS      = 8;
// ─── Helpers ─────────────────────────────────────────────────────────────────

function bandAverage(data: Uint8Array, from: number, to: number) {
  const end = Math.min(data.length, to);
  if (end <= from) return 0;
  let total = 0;
  for (let i = from; i < end; i++) total += data[i] ?? 0;
  return total / (end - from) / 255;
}

function hexToRgba(hex: string, alpha: number) {
  const v = hex.replace("#", "");
  const full = v.length === 3 ? v.split("").map(c => c + c).join("") : v;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Draw: Background ─────────────────────────────────────────────────────────

function paintBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  motionTime: number,
  volume: number,
  bass: number,
) {
  // Dark smear — enough opacity to prevent colour accumulation blowing out to white
  ctx.fillStyle = "rgba(5, 8, 20, 0.35)";
  ctx.fillRect(0, 0, w, h);

  // Left ambient
  const lg = ctx.createRadialGradient(w * 0.12, h * 0.36, 0, w * 0.12, h * 0.36, w * 0.52);
  lg.addColorStop(0,   hexToRgba(LEFT_CORE,  0.28 + volume * 0.18 + bass * 0.10));
  lg.addColorStop(0.5, hexToRgba(LEFT_OUTER, 0.12));
  lg.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, w, h);

  // Right ambient
  const rg = ctx.createRadialGradient(w * 0.88, h * 0.38, 0, w * 0.88, h * 0.38, w * 0.52);
  rg.addColorStop(0,   hexToRgba(RIGHT_CORE,  0.28 + volume * 0.18 + bass * 0.10));
  rg.addColorStop(0.5, hexToRgba(RIGHT_OUTER, 0.12));
  rg.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, w, h);

  // Subtle digital scan lines
  const lineSpacing = Math.max(4, Math.floor(h / 60));
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 0.5;
  for (let y = 0; y < h; y += lineSpacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();

  // Drifting vertical lines
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  const drift = Math.sin(motionTime * 0.4 + bass * 3.2) * w * (0.02 + volume * 0.015);
  for (let x = -w * 0.06; x < w * 1.06; x += w / 11) {
    ctx.beginPath();
    ctx.moveTo(x + drift, 0);
    ctx.lineTo(x - drift, h);
    ctx.stroke();
  }
  ctx.restore();
}

// ─── Draw: Waves ──────────────────────────────────────────────────────────────

function buildWavePoints(
  side: "left" | "right",
  layer: WaveLayer,
  w: number,
  h: number,
  elapsed: number,
  energy: number,
) {
  const steps = 54;
  const points: { x: number; y: number }[] = [];
  const dir    = side === "left" ? 1 : -1;
  const startX = side === "left" ? -w * 0.12 : w * 1.12;
  const reach  = w * 0.82;
  const amp    = h * layer.amplitude * (1.2 + energy * 1.8);
  const base   = h * layer.baseline;

  for (let i = 0; i <= steps; i++) {
    const t   = i / steps;
    const x   = startX + dir * reach * t;
    // Primary
    const p1  = Math.sin(t * Math.PI * layer.frequency + elapsed * layer.speed + layer.phase) * amp;
    // φ sub-harmonic — creates the wide belly of a paint pour
    const p2  = Math.sin(t * Math.PI * layer.frequency * 0.618 - elapsed * layer.speed * 0.77) * amp * 0.42;
    // φ super-harmonic — fine ripples at the leading edge
    const p3  = Math.sin(t * Math.PI * layer.frequency * 1.618 + elapsed * layer.speed * 0.44 + layer.phase * 1.3) * amp * 0.22;
    // 2φ+1 harmonic — surface micro-texture
    const p4  = Math.sin(t * Math.PI * layer.frequency * 2.414 - elapsed * layer.speed * 0.31 + layer.phase * 0.7) * amp * 0.14;
    // Very slow deep undulation — the viscous rolling of thick paint
    const p5  = Math.sin(t * Math.PI * 0.382 + elapsed * 0.09 + layer.phase * 0.4) * amp * 0.32;
    const lift = Math.sin(t * Math.PI) * h * 0.18 * (0.5 + energy * 1.2);
    points.push({ x, y: base - p1 - p2 - p3 - p4 - p5 - lift });
  }
  return points;
}

function traceFilledWave(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  side: "left" | "right",
  w: number,
  h: number,
  thickness: number,
) {
  const anchorX = side === "left" ? -w * 0.16 : w * 1.16;
  const floorY  = h + h * thickness;
  ctx.beginPath();
  ctx.moveTo(anchorX, floorY);
  ctx.lineTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length - 1; i++) {
    const cur  = points[i]!;
    const next = points[i + 1]!;
    ctx.quadraticCurveTo(cur.x, cur.y, (cur.x + next.x) * 0.5, (cur.y + next.y) * 0.5);
  }
  ctx.lineTo(points[points.length - 1]!.x, points[points.length - 1]!.y);
  ctx.lineTo(anchorX, floorY);
  ctx.closePath();
}

function paintWaveSystem(
  ctx: CanvasRenderingContext2D,
  side: "left" | "right",
  layers: WaveLayer[],
  w: number,
  h: number,
  elapsed: number,
  energy: number,
) {
  const colors = side === "left"
    ? [LEFT_OUTER, LEFT_CORE, "#00c8e0", LEFT_OUTER]
    : [RIGHT_WARM, RIGHT_OUTER, RIGHT_CORE, RIGHT_OUTER];

  layers.forEach((layer, i) => {
    const points = buildWavePoints(side, layer, w, h, elapsed, energy);
    traceFilledWave(ctx, points, side, w, h, layer.thickness);

    const topY = Math.min(...points.map(p => p.y));
    const grad = ctx.createLinearGradient(0, topY, 0, h);
    grad.addColorStop(0,    hexToRgba("#ffffff", layer.opacity * 0.20));
    grad.addColorStop(0.12, hexToRgba(colors[Math.min(i + 1, colors.length - 1)]!, layer.opacity * 0.95));
    grad.addColorStop(0.44, hexToRgba(colors[i]!, layer.opacity * 0.80));
    grad.addColorStop(1,    "rgba(0,0,0,0)");

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = grad;
    ctx.shadowColor = colors[Math.min(i + 1, colors.length - 1)]!;
    ctx.shadowBlur  = 60 + energy * 45 - i * 4;
    ctx.fill();
    ctx.restore();

    // Edge highlight stroke — smooth bezier pass
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0]!.x, points[0]!.y);
    for (let j = 1; j < points.length - 1; j++) {
      const cur  = points[j]!;
      const next = points[j + 1]!;
      ctx.quadraticCurveTo(cur.x, cur.y, (cur.x + next.x) * 0.5, (cur.y + next.y) * 0.5);
    }
    ctx.lineTo(points[points.length - 1]!.x, points[points.length - 1]!.y);
    ctx.strokeStyle = hexToRgba("#ffffff", 0.18 + energy * 0.10 - i * 0.03);
    ctx.lineWidth   = Math.max(2.5, 4.5 - i * 0.5);
    ctx.shadowColor = colors[Math.min(i + 1, colors.length - 1)]!;
    ctx.shadowBlur  = 45 + energy * 35;
    ctx.globalCompositeOperation = "screen";
    ctx.stroke();
    ctx.restore();
  });
}

// ─── Draw: Center energy ──────────────────────────────────────────────────────

function paintCenterEnergy(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bass: number,
  mids: number,
  volume: number,
  motionTime: number,
) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const r  = w * (0.14 + volume * 0.05 + bass * 0.11);

  // Outer bloom
  const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.6);
  bloom.addColorStop(0,    hexToRgba("#ffffff",   0.18 + volume * 0.14));
  bloom.addColorStop(0.08, hexToRgba(LEFT_CORE,   0.22 + bass * 0.12));
  bloom.addColorStop(0.22, hexToRgba(CENTER_WHITE, 0.28 + mids * 0.10));
  bloom.addColorStop(0.52, hexToRgba(RIGHT_CORE,   0.20 + volume * 0.10));
  bloom.addColorStop(1,    "rgba(0,0,0,0)");
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = bloom;
  ctx.fillRect(cx - r * 1.6, cy - r * 1.6, r * 3.2, r * 3.2);
  ctx.restore();

  // Inner corona — tight bright core
  const inner = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.38);
  inner.addColorStop(0,   hexToRgba("#ffffff",  0.25 + bass * 0.15));
  inner.addColorStop(0.4, hexToRgba(LEFT_CORE,  0.18 + volume * 0.12));
  inner.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = inner;
  ctx.fillRect(cx - r * 0.38, cy - r * 0.38, r * 0.76, r * 0.76);
  ctx.restore();

  // Animated rings
  for (let i = 0; i < 4; i++) {
    const wobble = Math.sin(motionTime * (1.8 + i * 0.75) + bass * 10 + mids * 6 + i) * w * (0.02 + volume * 0.015);
    const ringR  = w * (0.042 + i * 0.042) + wobble;
    const col    = i % 2 === 0 ? LEFT_CORE : RIGHT_CORE;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = hexToRgba(col, 0.9 - i * 0.08);
    ctx.lineWidth   = Math.max(3, 5 - i * 0.35);
    ctx.shadowColor = col;
    ctx.shadowBlur  = 40 + volume * 40 + bass * 30;
    ctx.globalCompositeOperation = "screen";
    ctx.stroke();
    ctx.restore();
  }
}

// ─── Draw: EQ bars ────────────────────────────────────────────────────────────

function paintEqualizer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  volume: number,
  bandLevels: Float32Array,
) {
  const barW    = w * 0.014;
  const gap     = w * 0.007;
  const count   = bandLevels.length;
  const totalW  = count * barW + (count - 1) * gap;
  const startX  = w * 0.5 - totalW * 0.5;
  const baseY   = h * 0.87;
  const maxH    = h * 0.20;

  for (let i = 0; i < count; i++) {
    const t        = i / Math.max(1, count - 1);
    const band     = bandLevels[i] ?? 0;
    const center   = 1 - Math.abs(t - 0.5) * 0.3;
    const energy   = band * (0.76 + center * 0.24);
    const barH     = Math.max(h * 0.018, maxH * (0.08 + energy * (0.86 + volume * 0.44)));
    const x        = startX + i * (barW + gap);
    const y        = baseY - barH;
    const accent   = t < 0.5 ? LEFT_CORE : RIGHT_CORE;

    const grad = ctx.createLinearGradient(x, y, x, baseY);
    grad.addColorStop(0,   accent);
    grad.addColorStop(0.5, CENTER_WHITE);
    grad.addColorStop(1,   "rgba(255,255,255,0.06)");

    ctx.save();
    ctx.globalAlpha = 0.95 + volume * 0.05;
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle  = grad;
    ctx.shadowColor = accent;
    ctx.shadowBlur  = 32 + energy * 28;
    ctx.fillRect(x, y, barW, barH);
    ctx.restore();
  }
}

// ─── Draw: Ring bursts (beat reactive) ───────────────────────────────────────

function paintRingBursts(ctx: CanvasRenderingContext2D, rings: RingBurst[]) {
  for (const ring of rings) {
    if (ring.life <= 0) continue;
    const progress = ring.radius / ring.maxRadius;
    const alpha    = ring.life * (1 - progress * 0.6);
    ctx.save();
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(ring.color, Math.max(0, alpha * 1.0));
    ctx.lineWidth   = ring.thickness * (1 - progress * 0.7);
    ctx.shadowColor = ring.color;
    ctx.shadowBlur  = 50 + ring.life * 40;
    ctx.globalCompositeOperation = "screen";
    ctx.stroke();
    ctx.restore();
  }
}

// ─── Draw: Sparks ─────────────────────────────────────────────────────────────

function paintSparks(ctx: CanvasRenderingContext2D, sparks: SparkParticle[]) {
  for (const spark of sparks) {
    if (spark.life <= 0) continue;

    // Trail line from previous position
    const trailDx = spark.x - spark.prevX;
    const trailDy = spark.y - spark.prevY;
    const trailLen = Math.sqrt(trailDx * trailDx + trailDy * trailDy);
    if (trailLen > 0.5) {
      const trailGrad = ctx.createLinearGradient(spark.prevX, spark.prevY, spark.x, spark.y);
      trailGrad.addColorStop(0, hexToRgba(spark.color, 0));
      trailGrad.addColorStop(1, hexToRgba(spark.color, spark.life * 0.9));
      ctx.save();
      ctx.strokeStyle = trailGrad;
      ctx.lineWidth   = spark.size * spark.life * 1.2;
      ctx.shadowColor = spark.color;
      ctx.shadowBlur  = 18;
      ctx.globalCompositeOperation = "screen";
      ctx.beginPath();
      ctx.moveTo(spark.prevX, spark.prevY);
      ctx.lineTo(spark.x, spark.y);
      ctx.stroke();
      ctx.restore();
    }

    // Head dot
    ctx.save();
    ctx.fillStyle   = hexToRgba(spark.color, spark.life * 0.95);
    ctx.shadowColor = spark.color;
    ctx.shadowBlur  = 24 + spark.life * 28;
    ctx.globalCompositeOperation = "screen";
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, spark.size * spark.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── Draw: Drift particles ────────────────────────────────────────────────────

function paintDriftParticles(ctx: CanvasRenderingContext2D, particles: DriftParticle[]) {
  for (const p of particles) {
    if (p.life <= 0) continue;
    const alpha = (p.life / p.maxLife) * 0.92;

    // Soft trail behind drift direction
    const tdx = p.x - p.prevX;
    const tdy = p.y - p.prevY;
    const tlen = Math.sqrt(tdx * tdx + tdy * tdy);
    if (tlen > 0.3) {
      const tg = ctx.createLinearGradient(p.prevX, p.prevY, p.x, p.y);
      tg.addColorStop(0, hexToRgba(p.color, 0));
      tg.addColorStop(1, hexToRgba(p.color, alpha * 0.8));
      ctx.save();
      ctx.strokeStyle = tg;
      ctx.lineWidth   = p.size * 1.4;
      ctx.shadowColor = p.color;
      ctx.shadowBlur  = 16;
      ctx.globalCompositeOperation = "screen";
      ctx.beginPath();
      ctx.moveTo(p.prevX, p.prevY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.restore();
    }

    // Head dot
    ctx.save();
    ctx.fillStyle   = hexToRgba(p.color, alpha);
    ctx.shadowColor = p.color;
    ctx.shadowBlur  = 28;
    ctx.globalCompositeOperation = "screen";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PremiumAudioVisualizer({
  analyser,
  audioRef,
  isPlaying  = false,
  className,
  fullHeight = false,
  showFrame  = true,
  showLogo   = true,
}: Props) {
  const wrapRef     = useRef<HTMLDivElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const rafRef      = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null | undefined>(analyser);
  const playingRef  = useRef<boolean>(isPlaying);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const localAnalyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  function resolveAudioElement() {
    if (audioRef?.current) {
      return audioRef.current;
    }

    if (typeof document === "undefined") {
      return null;
    }

    const audioElements = Array.from(document.querySelectorAll("audio"));
    const preferred =
      audioElements.find(
        (audio) =>
          audio.id !== "bedPlayer" &&
          !audio.paused &&
          !audio.ended &&
          Boolean(audio.currentSrc || audio.src),
      ) ??
      audioElements.find(
        (audio) =>
          audio.id !== "bedPlayer" &&
          Boolean(audio.currentSrc || audio.src),
      ) ??
      null;

    return preferred;
  }

  useEffect(() => { analyserRef.current = analyser; }, [analyser]);
  useEffect(() => { playingRef.current  = isPlaying; }, [isPlaying]);

  useEffect(() => {
    const audio = resolveAudioElement();
    if (!audio) {
      return;
    }

    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextCtor) {
      return;
    }

    const ensureAnalyser = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContextCtor();
        }

        const context = audioContextRef.current;
        if (!context) {
          return;
        }

        if (!mediaSourceRef.current) {
          mediaSourceRef.current = context.createMediaElementSource(audio);
        }

        if (!localAnalyserRef.current) {
          const nextAnalyser = context.createAnalyser();
          nextAnalyser.fftSize = 256;
          mediaSourceRef.current.connect(nextAnalyser);
          nextAnalyser.connect(context.destination);
          localAnalyserRef.current = nextAnalyser;
          dataArrayRef.current = new Uint8Array(nextAnalyser.frequencyBinCount);
        }

        if (context.state === "suspended") {
          await context.resume();
        }
      } catch {
        // Keep the visualizer usable with the external analyser fallback.
      }
    };

    const handlePlay = () => {
      void ensureAnalyser();
    };

    const handleLoadedData = () => {
      void ensureAnalyser();
    };

    const handleCanPlay = () => {
      void ensureAnalyser();
    };

    const handleUserUnlock = () => {
      void ensureAnalyser();
    };

    void ensureAnalyser();
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("loadeddata", handleLoadedData);
    audio.addEventListener("canplay", handleCanPlay);
    window.addEventListener("pointerdown", handleUserUnlock, { passive: true });

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("loadeddata", handleLoadedData);
      audio.removeEventListener("canplay", handleCanPlay);
      window.removeEventListener("pointerdown", handleUserUnlock);

      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        void audioContextRef.current.close();
      }

      audioContextRef.current = null;
      mediaSourceRef.current = null;
      localAnalyserRef.current = null;
      dataArrayRef.current = null;
    };
  }, [audioRef]);

  useEffect(() => {
    const wrap   = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const isMobile  = window.innerWidth < 768;
    const maxDpr    = isMobile ? 1.1 : 1.5;
    const rawCtx = canvas.getContext("2d");
    if (!rawCtx) return;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const ctx        = rawCtx as CanvasRenderingContext2D;
    const safeCanvas = canvas;

    // Size sync
    const syncSize = () => {
      const dpr      = Math.min(window.devicePixelRatio || 1, maxDpr);
      canvas.width   = wrap.offsetWidth  * dpr;
      canvas.height  = wrap.offsetHeight * dpr;
    };
    const ro = new ResizeObserver(syncSize);
    ro.observe(wrap);
    syncSize();

    // State
    const eqLevels   = new Float32Array(24);
    const driftParts: DriftParticle[]  = [];
    const sparks:     SparkParticle[]  = [];
    const rings:      RingBurst[]      = [];

    const driftLimit  = isMobile ? 20 : MAX_DRIFT;
    const sparkLimit  = isMobile ? 30 : MAX_SPARKS;

    let lastTs     = 0;
    let elapsed    = 0;
    let audioTime  = 0;
    let smoothBass = 0, smoothMids = 0, smoothHighs = 0, smoothVol = 0;
    let lastBass   = 0;
    let ringScaleBoost = 0;
    let visible    = !document.hidden;

    // ── Spawn helpers ─────────────────────────────────────────────────────────

    function emitRingBurst(x: number, y: number, bass: number) {
      if (rings.length >= MAX_RINGS) rings.splice(0, 1);
      const colors = [LEFT_CORE, RIGHT_CORE, RIGHT_OUTER, LEFT_MIST];
      for (let i = 0; i < 2; i++) {
        rings.push({
          x, y,
          radius:    safeCanvas.width * 0.03 + i * safeCanvas.width * 0.04,
          maxRadius: safeCanvas.width * (0.32 + bass * 0.24 + i * 0.1),
          life:      1,
          color:     colors[i % colors.length]!,
          thickness: 4.6 - i * 0.7,
        });
      }
    }

    function emitSparks(cx: number, cy: number, count: number, vol: number) {
      if (sparks.length >= sparkLimit) return;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (0.65 + Math.random() * 1.15) * (1 + vol * 1.6);
        const sx = cx + (Math.random() - 0.5) * safeCanvas.width * 0.04;
        const sy = cy + (Math.random() - 0.5) * safeCanvas.height * 0.04;
        sparks.push({
          x: sx, y: sy, prevX: sx, prevY: sy,
          vx:    Math.cos(angle) * speed,
          vy:    Math.sin(angle) * speed - 0.3,
          size:  3 + Math.random() * 4,
          life:  0.9 + Math.random() * 0.25,
          color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)]!,
        });
      }
    }

    function spawnDrift(w: number, h: number, highs: number, vol: number) {
      if (highs < 0.12 || driftParts.length >= driftLimit) return;
      const count = Math.min(5, 1 + Math.floor(highs * 8));
      for (let i = 0; i < count; i++) {
        const side  = Math.random() > 0.5 ? "left" : "right";
        const color = side === "left"
          ? (Math.random() > 0.65 ? LEFT_MIST  : LEFT_CORE)
          : (Math.random() > 0.70 ? RIGHT_WARM : RIGHT_CORE);
        const dx = (side === "left" ? w * 0.26 : w * 0.74) + (Math.random() - 0.5) * w * 0.16;
        const dy = h * (0.22 + Math.random() * 0.50);
        driftParts.push({
          x: dx, y: dy, prevX: dx, prevY: dy,
          vx:      (side === "left" ? 1 : -1) * (0.05 + Math.random() * 0.12),
          vy:      (Math.random() - 0.5) * 0.05 - vol * 0.03,
          size:    5 + Math.random() * 7,
          life:    1,
          maxLife: 1,
          color,
        });
      }
    }

    // ── Step helpers ──────────────────────────────────────────────────────────

    function stepRings(dt: number) {
      let next = 0;
      for (let i = 0; i < rings.length; i++) {
        const r = rings[i]!;
        r.radius += (r.maxRadius - r.radius) * Math.min(1, dt * 2.8);
        r.life   -= dt * 0.75;
        if (r.life > 0) { rings[next] = r; next++; }
      }
      rings.length = next;
    }

    function stepSparks(w: number, h: number, dt: number) {
      let next = 0;
      for (let i = 0; i < sparks.length; i++) {
        const s    = sparks[i]!;
        s.prevX    = s.x;
        s.prevY    = s.y;
        s.x       += s.vx * dt * 60 * w * 0.006;
        s.y       += s.vy * dt * 60 * h * 0.006;
        s.vy      += dt * 0.08;
        s.life    -= dt * 1.6;
        if (s.life > 0) { sparks[next] = s; next++; }
      }
      sparks.length = next;
    }

    function stepDrift(w: number, h: number, dt: number) {
      let next = 0;
      for (let i = 0; i < driftParts.length; i++) {
        const p  = driftParts[i]!;
        p.prevX  = p.x;
        p.prevY  = p.y;
        p.x     += p.vx * dt * 60 * w * 0.01;
        p.y     += p.vy * dt * 60 * h * 0.01;
        p.life  -= dt * 0.13;
        if (p.life > 0) { driftParts[next] = p; next++; }
      }
      driftParts.length = next;
    }

    // ── Main loop ─────────────────────────────────────────────────────────────

    function tick(ts: number) {
      if (!visible) return;

      const dt    = Math.min((ts - lastTs) / 1000 || 0.016, 0.05);
      lastTs      = ts;
      elapsed    += dt;

      const w = safeCanvas.width;
      const h = safeCanvas.height;
      const cx = w * 0.5;
      const cy = h * 0.5;

      const node = localAnalyserRef.current ?? analyserRef.current;
      const mediaElement = resolveAudioElement();
      const playing =
        mediaElement
          ? !mediaElement.paused &&
            !mediaElement.ended &&
            Boolean(mediaElement.currentSrc || mediaElement.src)
          : playingRef.current;

      // ── Audio analysis ────────────────────────────────────────────────────

      if (node && playing) {
        const bins = node.frequencyBinCount;
        if (
          localAnalyserRef.current === node &&
          (!dataArrayRef.current || dataArrayRef.current.length !== bins)
        ) {
          dataArrayRef.current = new Uint8Array(bins);
        }
        const data =
          localAnalyserRef.current === node && dataArrayRef.current
            ? dataArrayRef.current
            : new Uint8Array(bins);
        node.getByteFrequencyData(data);

        let bassTotal = 0;
        let midsTotal = 0;
        let highsTotal = 0;
        const bassEnd = Math.min(10, bins);
        const midsEnd = Math.min(40, bins);
        const highsEnd = Math.min(80, bins);

        for (let index = 0; index < bassEnd; index += 1) {
          bassTotal += data[index] ?? 0;
        }
        for (let index = 10; index < midsEnd; index += 1) {
          midsTotal += data[index] ?? 0;
        }
        for (let index = 40; index < highsEnd; index += 1) {
          highsTotal += data[index] ?? 0;
        }

        const rawBassValue = bassEnd > 0 ? bassTotal / bassEnd : 0;
        const rawMidsValue = midsEnd > 10 ? midsTotal / (midsEnd - 10) : 0;
        const rawHighsValue = highsEnd > 40 ? highsTotal / (highsEnd - 40) : 0;
        const rawBass = rawBassValue / 255;
        const rawMids = rawMidsValue / 255;
        const rawHighs = rawHighsValue / 255;
        const rawVol = Math.min(1, (rawBass * 0.42) + (rawMids * 0.34) + (rawHighs * 0.24));

        const atk = 0.65, rel = 0.93;
        const smooth = (prev: number, raw: number) =>
          raw > prev ? prev * (1 - atk) + raw * atk : prev * rel;

        smoothBass  = smooth(smoothBass,  rawBass);
        smoothMids  = smooth(smoothMids,  rawMids);
        smoothHighs = smooth(smoothHighs, rawHighs);
        smoothVol   = smooth(smoothVol,   rawVol);

        // Beat detection
        const isBeat = rawBassValue - lastBass > 30;
        if (isBeat) {
          ringScaleBoost = Math.min(1.2, ringScaleBoost + 0.9);
          emitRingBurst(cx, cy, rawBass);
          emitSparks(cx, cy, 10 + Math.floor(rawBass * 16), rawVol);
        }
        lastBass = rawBassValue;

        // High-freq drift particles
        spawnDrift(w, h, rawHighs, rawVol);

        // EQ bands
        const eqStart = 2;
        const eqEnd   = Math.min(bins, 512);
        const step    = Math.max(1, Math.floor((eqEnd - eqStart) / eqLevels.length));
        for (let i = 0; i < eqLevels.length; i++) {
          const from   = eqStart + i * step;
          const raw    = bandAverage(data, from, Math.min(bins, from + step));
          const cur    = eqLevels[i] ?? 0;
          eqLevels[i]  = raw > cur ? cur * 0.50 + raw * 0.50 : cur * 0.88 + raw * 0.12;
        }
      } else {
        smoothBass  *= 0.88;
        smoothMids  *= 0.88;
        smoothHighs *= 0.88;
        smoothVol   *= 0.88;
        lastBass = 0;
        for (let i = 0; i < eqLevels.length; i++) {
          eqLevels[i] = (eqLevels[i] ?? 0) * 0.82;
        }
      }

      ringScaleBoost *= 0.9;
      audioTime += dt * Math.max(0.06, 0.25 + smoothBass * 2.6 + smoothMids * 1.8);

      // ── Step simulations ──────────────────────────────────────────────────

      stepRings(dt);
      stepSparks(w, h, dt);
      stepDrift(w, h, dt);

      // ── Paint ─────────────────────────────────────────────────────────────

      paintBackground(ctx, w, h, audioTime, smoothVol, smoothBass);

      paintWaveSystem(ctx, "left",  LEFT_LAYERS,  w, h, audioTime,
        smoothBass * 1.32 + smoothMids * 0.35 + smoothVol * 0.62);
      paintWaveSystem(ctx, "right", RIGHT_LAYERS, w, h, audioTime + 0.6,
        smoothBass * 0.34 + smoothMids * 1.18 + smoothVol * 0.58);

      // Paint-mix blend where the two colour fields collide at centre
      {
        const blend = ctx.createLinearGradient(w * 0.15, 0, w * 0.85, 0);
        blend.addColorStop(0,    "rgba(0,0,0,0)");
        blend.addColorStop(0.35, hexToRgba(LEFT_CORE,    0.18 + smoothVol * 0.16));
        blend.addColorStop(0.50, hexToRgba(CENTER_WHITE, 0.28 + smoothBass * 0.22 + ringScaleBoost * 0.2));
        blend.addColorStop(0.65, hexToRgba(RIGHT_CORE,   0.18 + smoothVol * 0.16));
        blend.addColorStop(1,    "rgba(0,0,0,0)");
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = blend;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      paintCenterEnergy(ctx, w, h, smoothBass, smoothMids, smoothVol, audioTime);
      paintEqualizer(ctx, w, h, smoothVol, eqLevels);

      paintRingBursts(ctx, rings);
      paintSparks(ctx, sparks);
      paintDriftParticles(ctx, driftParts);

      ctx.save();
      ctx.fillStyle = "rgba(5, 8, 20, 0.35)";
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      rafRef.current = requestAnimationFrame(tick);
    }

    // ── Visibility ────────────────────────────────────────────────────────────

    const onVis = () => {
      visible = !document.hidden;
      if (!visible) { cancelAnimationFrame(rafRef.current); return; }
      lastTs         = performance.now();
      rafRef.current = requestAnimationFrame(tick);
    };
    document.addEventListener("visibilitychange", onVis);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);

    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`relative w-full overflow-hidden ${
        fullHeight ? "h-full rounded-none" : "rounded-[1.8rem]"
      } ${className ?? ""}`}
      style={fullHeight ? undefined : { height: "clamp(220px, 28vw, 360px)" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {showLogo && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="fsr-logo-card">
            <div className="fsr-logo-pulse">
              <Image
                src="/brand/FSRLogo.svg"
                alt="FlowSoundz Radio"
                width={220}
                height={88}
                className="fsr-logo-img h-auto w-[clamp(140px,18vw,220px)]"
                priority
              />
            </div>
          </div>
        </div>
      )}

      {showFrame && (
        <div className="pointer-events-none absolute inset-0 rounded-[1.8rem] shadow-[inset_0_0_100px_rgba(0,229,255,0.10),inset_0_0_60px_rgba(124,77,255,0.09)]" />
      )}

      <style jsx>{`
        .fsr-logo-card {
          position: relative;
          padding: 14px 32px 16px;
          border-radius: 20px;
          background: rgba(1, 2, 12, 0.92);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(0, 229, 255, 0.22);
          box-shadow:
            0 0 0 1px rgba(124, 77, 255, 0.10),
            0 16px 48px rgba(0, 0, 0, 0.85),
            0 0 80px rgba(0, 229, 255, 0.08),
            0 0 120px rgba(124, 77, 255, 0.06),
            inset 0 1px 0 rgba(0, 229, 255, 0.14),
            inset 0 -1px 0 rgba(124, 77, 255, 0.08);
        }

        .fsr-logo-pulse {
          animation: fsr-logo-pulse 5s ease-in-out infinite;
        }

        .fsr-logo-img {
          filter:
            drop-shadow(0px 1px 0px rgba(0, 229, 255, 1))
            drop-shadow(0px 2px 0px rgba(0, 160, 220, 0.85))
            drop-shadow(0px 3px 0px rgba(0, 100, 180, 0.65))
            drop-shadow(0px 4px 0px rgba(0, 60, 140, 0.45))
            drop-shadow(0px 5px 12px rgba(0, 229, 255, 0.60));
        }

        @keyframes fsr-logo-pulse {
          0%, 100% {
            transform: scale(1) translateY(0px);
            filter:
              drop-shadow(0 0 18px rgba(0, 229, 255, 0.90))
              drop-shadow(0 0 40px rgba(0, 229, 255, 0.35))
              drop-shadow(0 0 80px rgba(0, 229, 255, 0.12));
          }
          50% {
            transform: scale(1.035) translateY(-3px);
            filter:
              drop-shadow(0 0 22px rgba(255, 61, 242, 0.90))
              drop-shadow(0 0 50px rgba(124, 77, 255, 0.40))
              drop-shadow(0 0 90px rgba(124, 77, 255, 0.14));
          }
        }
      `}</style>
    </div>
  );
}
