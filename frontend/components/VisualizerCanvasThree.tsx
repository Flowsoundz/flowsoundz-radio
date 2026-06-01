"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// ─── Ring geometry ────────────────────────────────────────────────────────────
const MAX_BAR_COUNT = 128;
const RING_INNER = 0.88;
const RING_MAX_H = 0.75;
const RING_Z     = 0.85;
const MAX_CIR_SEGS = 64;

// ─── Aurora band definitions ──────────────────────────────────────────────────
const BAND_Y:     number[] = [-1.80, -0.55, 0.55, 1.65];
const BAND_RAY_H: number[] = [ 0.80,  1.20, 1.40, 1.05];

// ─── Palette ──────────────────────────────────────────────────────────────────
const C_NAVY    = new THREE.Color("#000c38");
const C_BLUE    = new THREE.Color("#001faa");
const C_OCEAN   = new THREE.Color("#0055cc");
const C_CYAN    = new THREE.Color("#00aaff");
const C_BRIGHT  = new THREE.Color("#00e5ff");
const C_ICE     = new THREE.Color("#aaffff");
const C_VIOLET  = new THREE.Color("#5522dd");
const C_PURPLE  = new THREE.Color("#8833ff");
const C_MAGENTA = new THREE.Color("#bb00bb");
const C_PINK    = new THREE.Color("#ff2da6");

// ─── Helpers ──────────────────────────────────────────────────────────────────
function h2(a: number, b: number): number {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function fract(v: number) { return v - Math.floor(v); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function ss(e0: number, e1: number, v: number) {
  const t = Math.max(0, Math.min(1, (v - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
function c01(v: number) { return v < 0 ? 0 : v > 1 ? 1 : v; }

// Larger, much softer sprite — overlapping additive particles create natural glow
function makeSprite(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0,    "rgba(255,255,255,1.0)");
  g.addColorStop(0.04, "rgba(255,255,255,0.95)");
  g.addColorStop(0.18, "rgba(255,255,255,0.60)");
  g.addColorStop(0.42, "rgba(255,255,255,0.18)");
  g.addColorStop(0.70, "rgba(255,255,255,0.05)");
  g.addColorStop(1.0,  "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// ─── Component ────────────────────────────────────────────────────────────────
type Props = {
  isPlaying?: boolean;
  analyser?: AnalyserNode | null;
  className?: string;
  isActive?: boolean;
};

export function VisualizerCanvasThree({
  isPlaying = false,
  analyser = null,
  className,
  isActive = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playRef      = useRef(isPlaying);
  const analyserRef  = useRef(analyser);
  const activeRef    = useRef(isActive);
  useEffect(() => { playRef.current     = isPlaying; }, [isPlaying]);
  useEffect(() => { analyserRef.current = analyser;  }, [analyser]);
  useEffect(() => { activeRef.current   = isActive;  }, [isActive]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── Device tier ───────────────────────────────────────────────────────
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
                  || window.innerWidth < 768;
    const lowCPU   = typeof navigator.hardwareConcurrency === "number"
                  && navigator.hardwareConcurrency <= 4;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isLow    = isMobile || lowCPU || prefersReducedMotion;
    const isVeryLow =
      prefersReducedMotion ||
      (typeof navigator.hardwareConcurrency === "number" &&
        navigator.hardwareConcurrency <= 2);

    const AURORA    = isVeryLow ? 1400 : isLow ? 2200 : 5200;
    const EMBERS    = isVeryLow ?  140 : isLow ?  260 :  720;
    const STARS     = isVeryLow ?   60 : isLow ?  120 :  320;
    const PARTICLES = AURORA + EMBERS + STARS;
    const ACTIVE_BAR_COUNT = isVeryLow ? 48 : isLow ? 72 : MAX_BAR_COUNT;
    const ACTIVE_CIR_SEGS = isVeryLow ? 28 : isLow ? 40 : MAX_CIR_SEGS;
    const MAX_DPR   = isLow ? 1.0  : 1.5;   // cap retina to 1.5× to cut fill-rate
    const BASE_SIZE = isLow ? 0.14 : 0.13;   // slightly larger on mobile for coverage
    const minFrameMs = prefersReducedMotion ? 42 : isLow ? 28 : 16;

    // ── Renderer ──────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: false, alpha: false, powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_DPR));
    renderer.setClearColor(0x010510, 1);
    Object.assign(renderer.domElement.style, { width: "100%", height: "100%", display: "block" });
    container.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    scene.background = new THREE.Color(0x010510);
    const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 100);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);

    const resize = () => {
      const w = container.clientWidth || 1, h = container.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // ── Aurora geometry ───────────────────────────────────────────────────
    const pGeo  = new THREE.BufferGeometry();
    const pPos  = new Float32Array(PARTICLES * 3);
    const pCol  = new Float32Array(PARTICLES * 3);
    const pSeed = new Float32Array(PARTICLES);
    for (let i = 0; i < PARTICLES; i++) pSeed[i] = Math.random() * 9999;
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute("color",    new THREE.BufferAttribute(pCol, 3));

    const sprite = makeSprite();
    const pMat = new THREE.PointsMaterial({
      size: BASE_SIZE, map: sprite, vertexColors: true,
      transparent: true, opacity: 0.90,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });
    scene.add(new THREE.Points(pGeo, pMat));

    // ── Frequency ring ─────────────────────────────────────────────────────
    const rGeo = new THREE.BufferGeometry();
    const rPos = new Float32Array(ACTIVE_BAR_COUNT * 2 * 3);
    const rCol = new Float32Array(ACTIVE_BAR_COUNT * 2 * 3);
    rGeo.setAttribute("position", new THREE.BufferAttribute(rPos, 3));
    rGeo.setAttribute("color",    new THREE.BufferAttribute(rCol, 3));
    const rMat = new THREE.LineBasicMaterial({
      vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    scene.add(new THREE.LineSegments(rGeo, rMat));

    // Inner base circle
    const cGeo = new THREE.BufferGeometry();
    const cPos = new Float32Array((ACTIVE_CIR_SEGS + 1) * 3);
    cGeo.setAttribute("position", new THREE.BufferAttribute(cPos, 3));
    const cMat = new THREE.LineBasicMaterial({
      color: 0x00aaff, blending: THREE.AdditiveBlending,
      depthWrite: false, transparent: true, opacity: 0.35,
    });
    scene.add(new THREE.Line(cGeo, cMat));

    // ── Pre-computed trig tables ──────────────────────────────────────────
    const TAU = Math.PI * 2;
    const barCos = new Float32Array(ACTIVE_BAR_COUNT);
    const barSin = new Float32Array(ACTIVE_BAR_COUNT);
    for (let i = 0; i < ACTIVE_BAR_COUNT; i++) {
      const a = (i / ACTIVE_BAR_COUNT) * TAU - Math.PI / 2;
      barCos[i] = Math.cos(a); barSin[i] = Math.sin(a);
    }
    const cirCos = new Float32Array(ACTIVE_CIR_SEGS + 1);
    const cirSin = new Float32Array(ACTIVE_CIR_SEGS + 1);
    for (let i = 0; i <= ACTIVE_CIR_SEGS; i++) {
      const a = (i / ACTIVE_CIR_SEGS) * TAU;
      cirCos[i] = Math.cos(a); cirSin[i] = Math.sin(a);
      cPos[i * 3 + 2] = RING_Z;
    }
    for (let i = 0; i < ACTIVE_BAR_COUNT * 2; i++) rPos[i * 3 + 2] = RING_Z;

    // ── Audio state ────────────────────────────────────────────────────────
    let freqData: Uint8Array<ArrayBuffer> | null = null;
    let sBass = 0, sMid = 0, sHigh = 0;
    let beatFlash = 0, prevRaw = 0;
    const barSmooth = new Float32Array(ACTIVE_BAR_COUNT);

    const tc = new THREE.Color(), tc2 = new THREE.Color();
    const start = performance.now();
    let fid = 0;
    let lastRenderTs = 0;

    const onVisibility = () => {
      if (document.hidden || !activeRef.current) {
        window.cancelAnimationFrame(fid);
        fid = 0;
        return;
      }

      fid = window.requestAnimationFrame(tick);
    };
    document.addEventListener("visibilitychange", onVisibility);

    // ── Tick ──────────────────────────────────────────────────────────────
    const tick = () => {
      if (!activeRef.current) {
        fid = 0;
        return;
      }

      const now = performance.now();
      if (now - lastRenderTs < minFrameMs) {
        fid = window.requestAnimationFrame(tick);
        return;
      }
      lastRenderTs = now;

      const t      = (now - start) * 0.001;
      const isPlay = playRef.current;

      // Audio
      const aNode = analyserRef.current;
      let rawBass = 0, rawMid = 0, rawHigh = 0;
      if (aNode && isPlay) {
        const n = aNode.frequencyBinCount;
        if (!freqData || freqData.length !== n)
          freqData = new Uint8Array(n) as Uint8Array<ArrayBuffer>;
        aNode.getByteFrequencyData(freqData);
        const b1 = Math.max(1, n * 0.04 | 0);
        const b2 = Math.max(b1 + 1, n * 0.22 | 0);
        const b3 = Math.max(b2 + 1, n * 0.58 | 0);
        for (let j = 0;  j < b1; j++) rawBass += freqData[j]!;  rawBass /= b1 * 255;
        for (let j = b1; j < b2; j++) rawMid  += freqData[j]!;  rawMid  /= (b2 - b1) * 255;
        for (let j = b2; j < b3; j++) rawHigh += freqData[j]!;  rawHigh /= (b3 - b2) * 255;
      }

      sBass = sBass * 0.75 + rawBass * 0.25;
      sMid  = sMid  * 0.65 + rawMid  * 0.35;
      sHigh = sHigh * 0.55 + rawHigh * 0.45;
      const delta = rawBass - prevRaw;
      if (delta > 0.10) beatFlash = c01(beatFlash + delta * 2.0);
      beatFlash *= 0.88;
      prevRaw    = rawBass * 0.45 + prevRaw * 0.55;

      const bassE  = isPlay ? sBass : 0;
      const midE   = isPlay ? sMid  : 0;
      const highE  = isPlay ? sHigh : 0;
      const idleB  = Math.sin(t * 0.38) * 0.15 * (isPlay ? 0 : 1);
      const breathe = 0.55 + bassE * 1.10 + midE * 0.28 + beatFlash * 0.55 + idleB + 0.12;
      const ripSpeed = 2.8 + midE * 6.0;
      const ripAmp   = midE * 0.55 + highE * 0.22;

      // Particle size pop on beat
      pMat.size = BASE_SIZE + beatFlash * 0.06;

      // ── Aurora ────────────────────────────────────────────────────────
      for (let i = 0; i < AURORA; i++) {
        const i3 = i * 3;
        const sd = pSeed[i]!;
        const bi = (h2(sd, 0) * 4) | 0;
        const bY = BAND_Y[bi]!;
        const mR = BAND_RAY_H[bi]!;
        const xB = lerp(-4.4, 4.4, h2(sd, 1));
        const rr = h2(sd, 2);
        const ph = h2(sd, 3) * TAU;
        const os = 0.18 + h2(sd, 4) * 0.30;
        const tb = h2(sd, 6);

        const cu  = xB * 0.44 + t * 0.17 + ph * 0.36;
        const cw  = (Math.sin(cu) * 0.65 + Math.sin(cu * 0.53 + 1.9) * 0.28
                  + Math.sin(xB * 1.55 + t * ripSpeed + bi * 0.85) * ripAmp
                  + Math.sin(xB * 2.30 + t * ripSpeed * 1.45) * highE * 0.18) * breathe;
        const ray = rr * rr * mR * (1.0 + bassE * 2.20 + beatFlash * 1.10) * breathe;
        const shm = Math.sin(t * os + ph) * 0.07 * (0.4 + midE * 0.8);

        pPos[i3]     = xB + Math.sin(t * 0.09 + bi * 1.6 + ph * 0.18) * 0.24;
        pPos[i3 + 1] = bY + cw + ray + shm;
        pPos[i3 + 2] = lerp(-2.8, 0.5, h2(sd, 5));

        const br = (1 - rr * 0.68) * breathe * (0.48 + tb * 0.52) * (1.0 + beatFlash * 0.90);
        switch (bi) {
          case 0: tc.copy(C_NAVY).lerp(C_BLUE, ss(0,0.5,tb)*2.2).lerp(C_OCEAN,ss(0.5,1,tb)); break;
          case 1: tc.copy(C_OCEAN).lerp(C_CYAN,ss(0,0.5,tb)).lerp(C_BRIGHT,ss(0.4,1,tb)*0.75); break;
          case 2: tc.copy(C_BRIGHT).lerp(C_VIOLET,ss(0.15,0.65,tb)).lerp(C_PURPLE,ss(0.55,1,tb)); break;
          default: tc.copy(C_PURPLE).lerp(C_MAGENTA,ss(0,0.55,tb)).lerp(C_PINK,ss(0.45,1,tb)); break;
        }
        tc.lerp(C_ICE, (ss(0.78,1,rr)*0.28 + highE*0.18) * c01(breathe));
        pCol[i3]=c01(tc.r*br); pCol[i3+1]=c01(tc.g*br); pCol[i3+2]=c01(tc.b*br);
      }

      // ── Embers ────────────────────────────────────────────────────────
      const EB = AURORA;
      for (let i = 0; i < EMBERS; i++) {
        const i3 = (EB + i) * 3;
        const sd = pSeed[EB + i]!;
        const cy = fract(h2(sd,1) + t*(0.20+h2(sd,0)*0.65)*(1+bassE*1.6+midE*0.8));
        tc.copy(h2(sd,4) > 0.5 ? C_BRIGHT : C_CYAN);
        const br = Math.sin(cy*Math.PI)*(0.3+bassE*0.9+midE*0.5)*(0.4+h2(sd,5)*0.65)
                 *(isPlay?1:0.45)*(1+beatFlash*1.2);
        pPos[i3]=lerp(-4.2,4.2,h2(sd,2))+Math.sin(t*0.26+sd)*0.22;
        pPos[i3+1]=lerp(-3.0,3.2,cy); pPos[i3+2]=lerp(-2.0,0.6,h2(sd,3));
        pCol[i3]=c01(tc.r*br); pCol[i3+1]=c01(tc.g*br); pCol[i3+2]=c01(tc.b*br);
      }

      // ── Stars ─────────────────────────────────────────────────────────
      const ST = EB + EMBERS;
      for (let i = 0; i < STARS; i++) {
        const i3 = (ST + i) * 3;
        const sd = pSeed[ST + i]!;
        const tw = 0.10 + Math.abs(Math.sin(t*(0.32+h2(sd,3)*0.85*(1+highE*2.5))+sd*5))*(0.38+highE*0.4);
        const sc = h2(sd,4);
        tc.copy(sc<0.4?C_BRIGHT:sc<0.72?C_ICE:C_CYAN);
        pPos[i3]=lerp(-6.0,6.0,h2(sd,0)); pPos[i3+1]=lerp(-3.5,3.5,h2(sd,1)); pPos[i3+2]=lerp(-4.5,-2.8,h2(sd,2));
        pCol[i3]=c01(tc.r*tw); pCol[i3+1]=c01(tc.g*tw); pCol[i3+2]=c01(tc.b*tw);
      }

      (pGeo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      (pGeo.getAttribute("color")    as THREE.BufferAttribute).needsUpdate = true;

      // ── Ring bars ─────────────────────────────────────────────────────
      const fLen = freqData ? freqData.length * 0.70 : 1;
      for (let i = 0; i < ACTIVE_BAR_COUNT; i++) {
        const binI  = freqData ? Math.min((Math.pow(i / ACTIVE_BAR_COUNT, 1.5) * fLen) | 0, freqData.length - 1) : 0;
        const rawV  = freqData ? freqData[binI]!/255 : 0;
        const idle  = isPlay ? 0 : 0.06*Math.abs(Math.sin(t*0.9+i*0.11));
        barSmooth[i] = barSmooth[i]!*0.62 + rawV*0.38;
        const barH  = (barSmooth[i]!+idle)*RING_MAX_H*(1+beatFlash*0.55);
        const cosA  = barCos[i]!, sinA = barSin[i]!;
        const base  = i * 6;
        rPos[base]=cosA*RING_INNER;   rPos[base+1]=sinA*RING_INNER;
        rPos[base+3]=cosA*(RING_INNER+barH); rPos[base+4]=sinA*(RING_INNER+barH);
        const hue = i / ACTIVE_BAR_COUNT;
        if      (hue < 0.35) tc2.copy(C_BRIGHT).lerp(C_CYAN,   hue/0.35);
        else if (hue < 0.65) tc2.copy(C_CYAN).lerp(C_VIOLET,   (hue-0.35)/0.30);
        else                 tc2.copy(C_VIOLET).lerp(C_PINK,    (hue-0.65)/0.35);
        const outerBr = 0.45+barSmooth[i]!*1.55+beatFlash*0.80;
        rCol[base]=tc2.r*0.18; rCol[base+1]=tc2.g*0.18; rCol[base+2]=tc2.b*0.18;
        rCol[base+3]=c01(tc2.r*outerBr); rCol[base+4]=c01(tc2.g*outerBr); rCol[base+5]=c01(tc2.b*outerBr);
      }
      (rGeo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      (rGeo.getAttribute("color")    as THREE.BufferAttribute).needsUpdate = true;

      // ── Inner circle ──────────────────────────────────────────────────
      const circR = RING_INNER*(1+bassE*0.055+beatFlash*0.04);
      for (let i = 0; i <= ACTIVE_CIR_SEGS; i++) {
        cPos[i*3]=cirCos[i]!*circR; cPos[i*3+1]=cirSin[i]!*circR;
      }
      (cGeo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      cMat.opacity = 0.20+bassE*0.50+beatFlash*0.30;

      camera.position.set(
        Math.sin(t*0.062)*0.14,
        Math.sin(t*0.046)*0.08,
        5.0 - bassE*0.35 - beatFlash*0.20,
      );
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      fid = window.requestAnimationFrame(tick);
    };

    if (activeRef.current) {
      fid = window.requestAnimationFrame(tick);
    }
    return () => {
      window.cancelAnimationFrame(fid);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      pGeo.dispose(); pMat.dispose(); sprite.dispose();
      rGeo.dispose(); rMat.dispose();
      cGeo.dispose(); cMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container)
        container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ background: "#010510", width: "100%", height: "100%" }}
    />
  );
}
