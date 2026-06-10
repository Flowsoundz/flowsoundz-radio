"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import { useGlobalAudioRefs } from "@/components/GlobalAudioProvider";

type WaveLayer = {
  baseline: number;
  amplitude: number;
  frequency: number;
  speed: number;
  phase: number;
  thickness: number;
  opacity: number;
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
  isActive?: boolean;
  engagementMultiplier?: number;
};

const LEFT_CORE = "#00e5ff";
const LEFT_OUTER = "#2e6bff";
const LEFT_MIST = "#dff9ff";
const RIGHT_CORE = "#ff3df2";
const RIGHT_OUTER = "#7c4dff";
const RIGHT_WARM = "#ff9f1c";
const CENTER_WHITE = "#fdf4ff";
const SPARK_COLORS = [LEFT_CORE, RIGHT_CORE, RIGHT_OUTER, RIGHT_WARM, LEFT_MIST];

const LEFT_LAYERS: WaveLayer[] = [
  { baseline: 0.78, amplitude: 0.22, frequency: 0.62, speed: 0.08, phase: Math.PI * 0.55, thickness: 0.48, opacity: 0.44 },
  { baseline: 0.68, amplitude: 0.17, frequency: 1.0, speed: 0.14, phase: 0, thickness: 0.36, opacity: 0.6 },
  { baseline: 0.58, amplitude: 0.13, frequency: 1.62, speed: 0.22, phase: Math.PI * 0.4, thickness: 0.26, opacity: 0.8 },
  { baseline: 0.5, amplitude: 0.1, frequency: 2.42, speed: 0.3, phase: Math.PI * 0.92, thickness: 0.18, opacity: 1 },
];

const RIGHT_LAYERS: WaveLayer[] = [
  { baseline: 0.78, amplitude: 0.22, frequency: 0.58, speed: -0.08, phase: Math.PI * 0.88, thickness: 0.48, opacity: 0.44 },
  { baseline: 0.68, amplitude: 0.17, frequency: 1.0, speed: -0.13, phase: Math.PI * 0.22, thickness: 0.36, opacity: 0.6 },
  { baseline: 0.58, amplitude: 0.13, frequency: 1.5, speed: -0.21, phase: Math.PI * 0.78, thickness: 0.26, opacity: 0.8 },
  { baseline: 0.5, amplitude: 0.1, frequency: 2.28, speed: -0.29, phase: Math.PI * 1.28, thickness: 0.18, opacity: 1 },
];

const MAX_RINGS = 8;
const MAX_SPARKS_DESKTOP = 72;
const MAX_SPARKS_MOBILE = 36;
const EQ_BAR_COUNT = 20;
const RADIO_BASS_HZ = 150;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}

function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getFrequencyRangeAverage(
  data: Uint8Array,
  sampleRate: number,
  fftSize: number,
  minHz: number,
  maxHz: number,
) {
  const binHz = sampleRate / fftSize;
  const start = clamp(Math.floor(minHz / binHz), 0, data.length - 1);
  const end = clamp(Math.ceil(maxHz / binHz), start + 1, data.length);
  let total = 0;

  for (let i = start; i < end; i += 1) {
    total += data[i] ?? 0;
  }

  return total / Math.max(1, end - start) / 255;
}

function paintBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  motionTime: number,
  volume: number,
  bass: number,
  pulse: number,
) {
  ctx.fillStyle = "rgba(2, 4, 12, 0.26)";
  ctx.fillRect(0, 0, w, h);

  const leftGlow = ctx.createRadialGradient(w * 0.14, h * 0.4, 0, w * 0.14, h * 0.4, w * 0.62);
  leftGlow.addColorStop(0, hexToRgba(LEFT_CORE, 0.48 + volume * 0.42 + pulse * 0.32));
  leftGlow.addColorStop(0.38, hexToRgba(LEFT_OUTER, 0.22 + bass * 0.16));
  leftGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = leftGlow;
  ctx.fillRect(0, 0, w, h);

  const rightGlow = ctx.createRadialGradient(w * 0.86, h * 0.4, 0, w * 0.86, h * 0.4, w * 0.62);
  rightGlow.addColorStop(0, hexToRgba(RIGHT_CORE, 0.46 + volume * 0.42 + pulse * 0.32));
  rightGlow.addColorStop(0.38, hexToRgba(RIGHT_OUTER, 0.22 + bass * 0.16));
  rightGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rightGlow;
  ctx.fillRect(0, 0, w, h);

  const centerWash = ctx.createRadialGradient(w * 0.5, h * 0.48, 0, w * 0.5, h * 0.48, w * 0.34);
  centerWash.addColorStop(0, hexToRgba(CENTER_WHITE, 0.18 + volume * 0.16 + pulse * 0.18));
  centerWash.addColorStop(0.45, hexToRgba("#7c4dff", 0.12 + bass * 0.12));
  centerWash.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = centerWash;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  const spacing = Math.max(5, Math.floor(h / 52));
  for (let y = 0; y < h; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.09)";
  ctx.lineWidth = 1;
  const drift = Math.sin(motionTime * 0.5 + bass * 4.5) * w * (0.024 + volume * 0.03 + pulse * 0.02);
  for (let x = -w * 0.1; x < w * 1.1; x += w / 10) {
    ctx.beginPath();
    ctx.moveTo(x + drift, 0);
    ctx.lineTo(x - drift, h);
    ctx.stroke();
  }
  ctx.restore();
}

function buildWavePoints(
  side: "left" | "right",
  layer: WaveLayer,
  w: number,
  h: number,
  elapsed: number,
  volume: number,
  bass: number,
  pulse: number,
) {
  const points: { x: number; y: number }[] = [];
  const steps = w < 900 ? 42 : 56;
  const dir = side === "left" ? 1 : -1;
  const startX = side === "left" ? -w * 0.16 : w * 1.16;
  const reach = w * 0.84;
  const base = h * layer.baseline;
  const amp = h * layer.amplitude * (1.08 + volume * 2.4 + bass * 2.8 + pulse * 1.8);
  const bassWarp = 0.2 + bass * 0.95 + pulse * 0.8;

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = startX + dir * reach * t;
    const p1 = Math.sin(t * Math.PI * layer.frequency + elapsed * layer.speed + layer.phase) * amp;
    const p2 = Math.sin(t * Math.PI * layer.frequency * 0.62 - elapsed * layer.speed * 0.78) * amp * 0.48;
    const p3 = Math.sin(t * Math.PI * layer.frequency * 1.68 + elapsed * layer.speed * 0.52 + layer.phase * 1.12) * amp * (0.18 + bassWarp * 0.14);
    const p4 = Math.sin(t * Math.PI * 2.8 + elapsed * 0.9 + layer.phase * 0.7) * amp * (0.06 + pulse * 0.12);
    const lift = Math.sin(t * Math.PI) * h * (0.14 + volume * 0.08 + bass * 0.12);
    points.push({ x, y: base - p1 - p2 - p3 - p4 - lift });
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
  const anchorX = side === "left" ? -w * 0.2 : w * 1.2;
  const floorY = h + h * thickness;

  ctx.beginPath();
  ctx.moveTo(anchorX, floorY);
  ctx.lineTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length - 1; i += 1) {
    const current = points[i]!;
    const next = points[i + 1]!;
    ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) * 0.5, (current.y + next.y) * 0.5);
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
  volume: number,
  bass: number,
  pulse: number,
) {
  const colors = side === "left"
    ? [LEFT_OUTER, LEFT_CORE, "#4ff8ff", LEFT_MIST]
    : [RIGHT_OUTER, RIGHT_CORE, RIGHT_WARM, CENTER_WHITE];

  layers.forEach((layer, index) => {
    const points = buildWavePoints(side, layer, w, h, elapsed, volume, bass, pulse);
    traceFilledWave(ctx, points, side, w, h, layer.thickness);

    const topY = Math.min(...points.map((point) => point.y));
    const leadColor = colors[Math.min(index + 1, colors.length - 1)]!;
    const bodyColor = colors[index]!;
    const grad = ctx.createLinearGradient(0, topY, 0, h);
    grad.addColorStop(0, hexToRgba(CENTER_WHITE, layer.opacity * (0.2 + pulse * 0.12)));
    grad.addColorStop(0.12, hexToRgba(leadColor, layer.opacity * (1.2 + volume * 0.28)));
    grad.addColorStop(0.44, hexToRgba(bodyColor, layer.opacity * (0.96 + bass * 0.2)));
    grad.addColorStop(1, "rgba(0,0,0,0)");

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = grad;
    ctx.shadowColor = leadColor;
    ctx.shadowBlur = 110 + volume * 90 + bass * 100 + pulse * 60 - index * 8;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length - 1; i += 1) {
      const current = points[i]!;
      const next = points[i + 1]!;
      ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) * 0.5, (current.y + next.y) * 0.5);
    }
    ctx.lineTo(points[points.length - 1]!.x, points[points.length - 1]!.y);
    ctx.strokeStyle = hexToRgba(CENTER_WHITE, 0.28 + volume * 0.18 + pulse * 0.14 - index * 0.03);
    ctx.lineWidth = Math.max(4, 8 - index);
    ctx.shadowColor = leadColor;
    ctx.shadowBlur = 70 + volume * 65 + bass * 55;
    ctx.globalCompositeOperation = "screen";
    ctx.stroke();
    ctx.restore();
  });
}

function paintCenterEnergy(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bass: number,
  mids: number,
  volume: number,
  pulse: number,
  motionTime: number,
) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const baseRadius = w * (0.12 + volume * 0.06 + bass * 0.08 + pulse * 0.05);

  const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 2.2);
  bloom.addColorStop(0, hexToRgba("#ffffff", 0.38 + volume * 0.2 + pulse * 0.16));
  bloom.addColorStop(0.08, hexToRgba(LEFT_CORE, 0.44 + bass * 0.26 + pulse * 0.16));
  bloom.addColorStop(0.2, hexToRgba(CENTER_WHITE, 0.54 + mids * 0.18));
  bloom.addColorStop(0.44, hexToRgba(RIGHT_CORE, 0.34 + volume * 0.18));
  bloom.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = bloom;
  ctx.fillRect(cx - baseRadius * 2.2, cy - baseRadius * 2.2, baseRadius * 4.4, baseRadius * 4.4);
  ctx.restore();

  const inner = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 0.52);
  inner.addColorStop(0, hexToRgba("#ffffff", 0.8 + pulse * 0.12));
  inner.addColorStop(0.36, hexToRgba(LEFT_CORE, 0.46 + volume * 0.18));
  inner.addColorStop(0.75, hexToRgba(RIGHT_CORE, 0.26 + bass * 0.12));
  inner.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = inner;
  ctx.fillRect(cx - baseRadius, cy - baseRadius, baseRadius * 2, baseRadius * 2);
  ctx.restore();

  for (let i = 0; i < 4; i += 1) {
    const wobble = Math.sin(motionTime * (1.9 + i * 0.6) + bass * 10 + mids * 5 + i) * w * (0.02 + bass * 0.02 + pulse * 0.015);
    const radius = w * (0.05 + i * 0.043) + wobble + pulse * w * 0.018;
    const color = i % 2 === 0 ? LEFT_CORE : RIGHT_CORE;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(color, 0.82 - i * 0.09);
    ctx.lineWidth = Math.max(3.5, 7 - i * 0.7 + pulse * 1.3);
    ctx.shadowColor = color;
    ctx.shadowBlur = 72 + volume * 70 + bass * 80 + pulse * 60;
    ctx.globalCompositeOperation = "screen";
    ctx.stroke();
    ctx.restore();
  }
}

function paintEqualizer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  volume: number,
  pulse: number,
  bands: Float32Array,
) {
  const barWidth = w * 0.016;
  const gap = w * 0.0065;
  const totalWidth = bands.length * barWidth + (bands.length - 1) * gap;
  const startX = w * 0.5 - totalWidth * 0.5;
  const baseY = h * 0.88;
  const maxHeight = h * 0.24;

  for (let i = 0; i < bands.length; i += 1) {
    const t = i / Math.max(1, bands.length - 1);
    const energy = bands[i] ?? 0;
    const barHeight = Math.max(h * 0.026, maxHeight * (0.1 + energy * 1.08 + volume * 0.12 + pulse * 0.08));
    const x = startX + i * (barWidth + gap);
    const y = baseY - barHeight;
    const accent = t < 0.5 ? LEFT_CORE : RIGHT_CORE;
    const grad = ctx.createLinearGradient(x, y, x, baseY);
    grad.addColorStop(0, CENTER_WHITE);
    grad.addColorStop(0.38, accent);
    grad.addColorStop(1, hexToRgba(accent, 0.08));

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = grad;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 48 + energy * 40 + pulse * 24;
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.restore();
  }
}

function paintRingBursts(ctx: CanvasRenderingContext2D, rings: RingBurst[]) {
  for (const ring of rings) {
    if (ring.life <= 0) {
      continue;
    }

    const progress = ring.radius / ring.maxRadius;
    const alpha = ring.life * (1 - progress * 0.58);
    ctx.save();
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(ring.color, Math.max(0, alpha));
    ctx.lineWidth = Math.max(1.6, ring.thickness * (1 - progress * 0.74));
    ctx.shadowColor = ring.color;
    ctx.shadowBlur = 86 * ring.life;
    ctx.globalCompositeOperation = "screen";
    ctx.stroke();
    ctx.restore();
  }
}

function paintSparks(ctx: CanvasRenderingContext2D, sparks: SparkParticle[]) {
  for (const spark of sparks) {
    if (spark.life <= 0) {
      continue;
    }

    const trail = ctx.createLinearGradient(spark.prevX, spark.prevY, spark.x, spark.y);
    trail.addColorStop(0, hexToRgba(spark.color, 0));
    trail.addColorStop(1, hexToRgba(spark.color, spark.life * 0.92));
    ctx.save();
    ctx.strokeStyle = trail;
    ctx.lineWidth = spark.size * spark.life * 1.2;
    ctx.shadowColor = spark.color;
    ctx.shadowBlur = 24;
    ctx.globalCompositeOperation = "screen";
    ctx.beginPath();
    ctx.moveTo(spark.prevX, spark.prevY);
    ctx.lineTo(spark.x, spark.y);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = hexToRgba(spark.color, spark.life);
    ctx.shadowColor = spark.color;
    ctx.shadowBlur = 30 + spark.life * 22;
    ctx.globalCompositeOperation = "screen";
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, spark.size * spark.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function PremiumAudioVisualizer({
  analyser,
  audioRef,
  isPlaying = false,
  className,
  fullHeight = false,
  showFrame = true,
  showLogo = true,
  isActive = true,
  engagementMultiplier = 1,
}: Props) {
  const {
    audioRef: globalAudioRef,
    analyserRef: globalAnalyserRef,
    dataArrayRef: globalDataArrayRef,
  } = useGlobalAudioRefs();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null | undefined>(analyser);
  const playingRef = useRef<boolean>(isPlaying);
  const activeRef = useRef<boolean>(isActive);
  const engagementRef = useRef<number>(engagementMultiplier);

  const resolveAudioElement = useCallback(() => {
    if (audioRef?.current) {
      return audioRef.current;
    }

    if (globalAudioRef.current) {
      return globalAudioRef.current;
    }

    if (typeof document === "undefined") {
      return null;
    }

    const audioElements = Array.from(document.querySelectorAll("audio"));
    return (
      audioElements.find(
        (audio) =>
          audio.id !== "bedPlayer" &&
          !audio.paused &&
          !audio.ended &&
          Boolean(audio.currentSrc || audio.src),
      ) ??
      audioElements.find(
        (audio) => audio.id !== "bedPlayer" && Boolean(audio.currentSrc || audio.src),
      ) ??
      null
    );
  }, [audioRef, globalAudioRef]);

  useEffect(() => { analyserRef.current    = analyser;            }, [analyser]);
  useEffect(() => { playingRef.current     = isPlaying;           }, [isPlaying]);
  useEffect(() => { activeRef.current      = isActive;            }, [isActive]);
  useEffect(() => { engagementRef.current  = engagementMultiplier;}, [engagementMultiplier]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) {
      return;
    }

    const isMobile = window.innerWidth < 768;
    const maxDpr = isMobile ? 1 : 1.5;
    const rawContext = canvas.getContext("2d", { alpha: true });
    if (!rawContext) {
      return;
    }
    const ctx = rawContext as CanvasRenderingContext2D;
    const safeCanvas = canvas;

    const syncSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      safeCanvas.width = Math.max(1, Math.floor(wrap.offsetWidth * dpr));
      safeCanvas.height = Math.max(1, Math.floor(wrap.offsetHeight * dpr));
    };

    const resizeObserver = new ResizeObserver(syncSize);
    resizeObserver.observe(wrap);
    syncSize();

    const eqLevels = new Float32Array(EQ_BAR_COUNT);
    const sparks: SparkParticle[] = [];
    const rings: RingBurst[] = [];
    const sparkLimit = isMobile ? MAX_SPARKS_MOBILE : MAX_SPARKS_DESKTOP;

    let lastTimestamp = 0;
    let motionTime = 0;
    let visible = !document.hidden;

    let smoothBass = 0;
    let smoothMids = 0;
    let smoothHighs = 0;
    let smoothVolume = 0;
    let pulse = 0;
    let lastBassInstant = 0;

    function emitRingBurst(x: number, y: number, bass: number, pulseEnergy: number) {
      if (rings.length >= MAX_RINGS) {
        rings.splice(0, rings.length - MAX_RINGS + 2);
      }

      rings.push({
        x,
        y,
        radius: safeCanvas.width * 0.04,
        maxRadius: safeCanvas.width * (0.18 + bass * 0.16 + pulseEnergy * 0.08),
        life: 1,
        color: LEFT_CORE,
        thickness: 7 + pulseEnergy * 2,
      });
      rings.push({
        x,
        y,
        radius: safeCanvas.width * 0.085,
        maxRadius: safeCanvas.width * (0.28 + bass * 0.2 + pulseEnergy * 0.12),
        life: 0.96,
        color: RIGHT_CORE,
        thickness: 5.2 + pulseEnergy * 1.8,
      });
    }

    function emitSparks(cx: number, cy: number, count: number, energy: number) {
      if (sparks.length >= sparkLimit) {
        return;
      }

      const nextCount = Math.min(count, sparkLimit - sparks.length);
      for (let i = 0; i < nextCount; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (0.7 + Math.random() * 1.2) * (1 + energy * 2.2);
        sparks.push({
          x: cx,
          y: cy,
          prevX: cx,
          prevY: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2.6 + Math.random() * 3.8,
          life: 0.82 + Math.random() * 0.32,
          color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)]!,
        });
      }
    }

    function stepRings(dt: number) {
      let next = 0;
      for (let i = 0; i < rings.length; i += 1) {
        const ring = rings[i]!;
        ring.radius = lerp(ring.radius, ring.maxRadius, Math.min(1, dt * 5.2));
        ring.life -= dt * 0.9;
        if (ring.life > 0) {
          rings[next] = ring;
          next += 1;
        }
      }
      rings.length = next;
    }

    function stepSparks(dt: number, w: number, h: number) {
      let next = 0;
      for (let i = 0; i < sparks.length; i += 1) {
        const spark = sparks[i]!;
        spark.prevX = spark.x;
        spark.prevY = spark.y;
        spark.x += spark.vx * dt * 60 * w * 0.006;
        spark.y += spark.vy * dt * 60 * h * 0.006;
        spark.vy += dt * 0.06;
        spark.life -= dt * 1.45;
        if (spark.life > 0) {
          sparks[next] = spark;
          next += 1;
        }
      }
      sparks.length = next;
    }

    function tick(timestamp: number) {
      if (!visible || !activeRef.current) {
        rafRef.current = 0;
        return;
      }

      const dt = Math.min((timestamp - lastTimestamp) / 1000 || 0.016, 0.05);
      lastTimestamp = timestamp;
      const w = safeCanvas.width;
      const h = safeCanvas.height;
      const cx = w * 0.5;
      const cy = h * 0.5;

      const node = analyserRef.current ?? globalAnalyserRef.current;
      const mediaElement = resolveAudioElement();
      if (mediaElement?.paused) {
        smoothBass *= 0.92;
        smoothMids *= 0.92;
        smoothHighs *= 0.92;
        smoothVolume *= 0.92;
        pulse *= 0.88;
        rafRef.current = window.requestAnimationFrame(tick);
        return;
      }

      const playing = mediaElement
        ? !mediaElement.paused && !mediaElement.ended && Boolean(mediaElement.currentSrc || mediaElement.src)
        : playingRef.current;

      if (node && playing) {
        const binCount = node.frequencyBinCount;
        const usesSharedAnalyser = analyserRef.current == null;
        if (
          usesSharedAnalyser &&
          (!globalDataArrayRef.current || globalDataArrayRef.current.length !== binCount)
        ) {
          globalDataArrayRef.current = new Uint8Array(binCount);
        }

        const data =
          usesSharedAnalyser && globalDataArrayRef.current
            ? globalDataArrayRef.current
            : new Uint8Array(binCount);
        node.getByteFrequencyData(data as Uint8Array<ArrayBuffer>);

        const sampleRate = node.context.sampleRate || 44100;
        const fftSize = node.fftSize || binCount * 2;
        const bassInstant = getFrequencyRangeAverage(data, sampleRate, fftSize, 0, RADIO_BASS_HZ);
        const lowMidInstant = getFrequencyRangeAverage(data, sampleRate, fftSize, 150, 800);
        const highInstant = getFrequencyRangeAverage(data, sampleRate, fftSize, 800, 4200);
        const volumeInstant = clamp(bassInstant * 0.44 + lowMidInstant * 0.34 + highInstant * 0.22, 0, 1);

        const eng = clamp(engagementRef.current, 1, 2.2);
        smoothBass = (bassInstant > smoothBass
          ? lerp(smoothBass, bassInstant, 0.34)
          : lerp(smoothBass, bassInstant, 0.12)) * (0.6 + eng * 0.4);
        smoothMids = (lowMidInstant > smoothMids
          ? lerp(smoothMids, lowMidInstant, 0.28)
          : lerp(smoothMids, lowMidInstant, 0.1)) * (0.7 + eng * 0.3);
        smoothHighs = highInstant > smoothHighs
          ? lerp(smoothHighs, highInstant, 0.24)
          : lerp(smoothHighs, highInstant, 0.09);
        smoothVolume = (volumeInstant > smoothVolume
          ? lerp(smoothVolume, volumeInstant, 0.26)
          : lerp(smoothVolume, volumeInstant, 0.1)) * (0.7 + eng * 0.3);

        const bassRise = bassInstant - lastBassInstant;
        const bassHit = bassInstant > 0.22 && bassRise > 0.065;
        if (bassHit) {
          pulse = Math.min(1.35, pulse + 0.85 + bassInstant * 0.35);
          emitRingBurst(cx, cy, bassInstant, pulse);
          emitSparks(cx, cy, 8 + Math.floor(bassInstant * 18), bassInstant);
        }
        lastBassInstant = bassInstant;

        const nyquist = sampleRate / 2;
        const maxEqHz = Math.min(6000, nyquist);
        for (let i = 0; i < eqLevels.length; i += 1) {
          const bandStart = i * (maxEqHz / eqLevels.length);
          const bandEnd = bandStart + maxEqHz / eqLevels.length;
          const bandValue = getFrequencyRangeAverage(data, sampleRate, fftSize, bandStart, bandEnd);
          eqLevels[i] = bandValue > eqLevels[i]
            ? lerp(eqLevels[i] ?? 0, bandValue, 0.42)
            : lerp(eqLevels[i] ?? 0, bandValue, 0.12);
        }
      } else {
        smoothBass *= 0.9;
        smoothMids *= 0.9;
        smoothHighs *= 0.9;
        smoothVolume *= 0.9;
        lastBassInstant *= 0.82;
        for (let i = 0; i < eqLevels.length; i += 1) {
          eqLevels[i] *= 0.82;
        }
      }

      pulse *= 0.9;
      motionTime += dt * Math.max(0.14, 0.6 + smoothVolume * 2.8 + smoothBass * 2.6);

      stepRings(dt);
      stepSparks(dt, w, h);

      paintBackground(ctx, w, h, motionTime, smoothVolume, smoothBass, pulse);
      paintWaveSystem(ctx, "left", LEFT_LAYERS, w, h, motionTime, smoothVolume, smoothBass, pulse);
      paintWaveSystem(ctx, "right", RIGHT_LAYERS, w, h, motionTime + 0.58, smoothVolume, smoothBass * 0.92 + smoothMids * 0.08, pulse);

      const centerBlend = ctx.createLinearGradient(w * 0.12, 0, w * 0.88, 0);
      centerBlend.addColorStop(0, "rgba(0,0,0,0)");
      centerBlend.addColorStop(0.34, hexToRgba(LEFT_CORE, 0.22 + smoothVolume * 0.18));
      centerBlend.addColorStop(0.5, hexToRgba(CENTER_WHITE, 0.46 + smoothBass * 0.22 + pulse * 0.18));
      centerBlend.addColorStop(0.66, hexToRgba(RIGHT_CORE, 0.22 + smoothVolume * 0.18));
      centerBlend.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = centerBlend;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      paintCenterEnergy(ctx, w, h, smoothBass, smoothMids, smoothVolume, pulse, motionTime);
      paintEqualizer(ctx, w, h, smoothVolume, pulse, eqLevels);
      paintRingBursts(ctx, rings);
      paintSparks(ctx, sparks);

      ctx.save();
      ctx.fillStyle = "rgba(2, 4, 12, 0.14)";
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      rafRef.current = window.requestAnimationFrame(tick);
    }

    const onVisibilityChange = () => {
      visible = !document.hidden;
      if (!visible) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
        return;
      }

      lastTimestamp = performance.now();
      if (activeRef.current) {
        rafRef.current = window.requestAnimationFrame(tick);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    if (activeRef.current) {
      rafRef.current = window.requestAnimationFrame(tick);
    }

    return () => {
      window.cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [globalAnalyserRef, globalDataArrayRef, isActive, resolveAudioElement]);

  return (
    <div
      ref={wrapRef}
      className={`relative w-full overflow-hidden ${fullHeight ? "h-full rounded-none" : "rounded-[1.8rem]"} ${className ?? ""}`}
      style={fullHeight ? undefined : { height: "clamp(220px, 28vw, 360px)" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {showLogo ? (
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
      ) : null}

      {showFrame ? (
        <div className="pointer-events-none absolute inset-0 rounded-[1.8rem] shadow-[inset_0_0_140px_rgba(0,229,255,0.18),inset_0_0_90px_rgba(124,77,255,0.16)]" />
      ) : null}

      <style jsx>{`
        .fsr-logo-card {
          position: relative;
          padding: 14px 32px 16px;
          border-radius: 20px;
          background: rgba(1, 2, 12, 0.88);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(0, 229, 255, 0.3);
          box-shadow:
            0 0 0 1px rgba(124, 77, 255, 0.14),
            0 16px 48px rgba(0, 0, 0, 0.9),
            0 0 110px rgba(0, 229, 255, 0.12),
            0 0 140px rgba(124, 77, 255, 0.09),
            inset 0 1px 0 rgba(0, 229, 255, 0.18),
            inset 0 -1px 0 rgba(124, 77, 255, 0.1);
        }

        .fsr-logo-pulse {
          animation: fsr-logo-pulse 5s ease-in-out infinite;
        }

        .fsr-logo-img {
          filter:
            drop-shadow(0px 1px 0px rgba(0, 229, 255, 1))
            drop-shadow(0px 2px 0px rgba(0, 160, 220, 0.9))
            drop-shadow(0px 3px 0px rgba(0, 100, 180, 0.72))
            drop-shadow(0px 4px 0px rgba(0, 60, 140, 0.52))
            drop-shadow(0px 5px 16px rgba(0, 229, 255, 0.72));
        }

        @keyframes fsr-logo-pulse {
          0%,
          100% {
            transform: scale(1) translateY(0px);
            filter:
              drop-shadow(0 0 28px rgba(0, 229, 255, 0.95))
              drop-shadow(0 0 54px rgba(0, 229, 255, 0.46))
              drop-shadow(0 0 108px rgba(0, 229, 255, 0.18));
          }

          50% {
            transform: scale(1.04) translateY(-3px);
            filter:
              drop-shadow(0 0 30px rgba(255, 61, 242, 0.95))
              drop-shadow(0 0 58px rgba(124, 77, 255, 0.5))
              drop-shadow(0 0 116px rgba(124, 77, 255, 0.18));
          }
        }
      `}</style>
    </div>
  );
}
