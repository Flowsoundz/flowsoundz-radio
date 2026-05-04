"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// ─── Simplex-noise (inline, no external dep) ──────────────────────────────────
// Compact 3D simplex noise — Stefan Gustavson / public domain

const grad3: number[][] = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],
];

const perm = new Uint8Array(512);
const permMod12 = new Uint8Array(512);
(function buildPerm() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j]!, p[i]!];
  }
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255]!;
    permMod12[i] = perm[i]! % 12;
  }
})();

function dot3(g: number[], x: number, y: number, z: number): number {
  return g[0]! * x + g[1]! * y + g[2]! * z;
}

function simplex3(xin: number, yin: number, zin: number): number {
  const F3 = 1 / 3, G3 = 1 / 6;
  const s  = (xin + yin + zin) * F3;
  const i  = Math.floor(xin + s);
  const j  = Math.floor(yin + s);
  const k  = Math.floor(zin + s);
  const t  = (i + j + k) * G3;
  const x0 = xin - (i - t), y0 = yin - (j - t), z0 = zin - (k - t);

  let i1 = 0, j1 = 0, k1 = 0, i2 = 0, j2 = 0, k2 = 0;
  if (x0 >= y0) {
    if (y0 >= z0)      { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; }
    else if (x0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; }
    else               { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; }
  } else {
    if (y0 < z0)       { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; }
    else if (x0 < z0)  { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; }
    else               { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; }
  }

  const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
  const x2 = x0 - i2 + 2*G3, y2 = y0 - j2 + 2*G3, z2 = z0 - k2 + 2*G3;
  const x3 = x0 - 1 + 3*G3, y3 = y0 - 1 + 3*G3, z3 = z0 - 1 + 3*G3;

  const ii = i & 255, jj = j & 255, kk = k & 255;

  const t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
  const n0 = t0 < 0 ? 0 : Math.pow(t0, 4) * dot3(grad3[permMod12[ii + perm[jj + perm[kk]!]!]!]!, x0, y0, z0);

  const t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
  const n1 = t1 < 0 ? 0 : Math.pow(t1, 4) * dot3(grad3[permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]!]!]!]!, x1, y1, z1);

  const t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
  const n2 = t2 < 0 ? 0 : Math.pow(t2, 4) * dot3(grad3[permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]!]!]!]!, x2, y2, z2);

  const t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
  const n3 = t3 < 0 ? 0 : Math.pow(t3, 4) * dot3(grad3[permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]!]!]!]!, x3, y3, z3);

  return 32 * (n0 + n1 + n2 + n3);
}

// ─── Component ────────────────────────────────────────────────────────────────

const NUM_PARTICLES = 3000;

const COLOR_STOPS: THREE.Color[] = [
  new THREE.Color("#00e5ff"),
  new THREE.Color("#9d6bff"),
  new THREE.Color("#ff4ddd"),
];

function lerpColor(out: THREE.Color, t: number): void {
  const scaled  = ((t % 1) + 1) % 1;
  const segment = scaled * (COLOR_STOPS.length - 1);
  const idx     = Math.floor(segment);
  const frac    = segment - idx;
  const a       = COLOR_STOPS[idx]     ?? COLOR_STOPS[0]!;
  const b       = COLOR_STOPS[idx + 1] ?? COLOR_STOPS[COLOR_STOPS.length - 1]!;
  out.copy(a).lerp(b, frac);
}

type Props = {
  isPlaying?: boolean;
  className?: string;
};

export function VisualizerCanvas({ isPlaying = false, className }: Props) {
  const mountRef     = useRef<HTMLDivElement>(null);
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);
    mount.appendChild(renderer.domElement);

    function syncSize() {
      const w = mount!.offsetWidth;
      const h = mount!.offsetHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    const ro = new ResizeObserver(syncSize);
    ro.observe(mount);

    // ── Scene / Camera ────────────────────────────────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 3.5;
    syncSize();

    // ── Particle geometry ─────────────────────────────────────────────────────
    const positions  = new Float32Array(NUM_PARTICLES * 3);
    const colors     = new Float32Array(NUM_PARTICLES * 3);
    const seeds      = new Float32Array(NUM_PARTICLES * 3); // noise offset seeds

    const tmpColor = new THREE.Color();

    for (let i = 0; i < NUM_PARTICLES; i++) {
      const theta  = Math.random() * Math.PI * 2;
      const r      = 0.1 + Math.random() * 2.2;
      positions[i * 3]     = Math.cos(theta) * r;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2.5;
      positions[i * 3 + 2] = Math.sin(theta) * r * 0.5;

      seeds[i * 3]     = Math.random() * 100;
      seeds[i * 3 + 1] = Math.random() * 100;
      seeds[i * 3 + 2] = Math.random() * 100;

      lerpColor(tmpColor, i / NUM_PARTICLES);
      colors[i * 3]     = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color",    new THREE.BufferAttribute(colors,    3));

    const mat = new THREE.PointsMaterial({
      size:          0.022,
      vertexColors:  true,
      blending:      THREE.AdditiveBlending,
      depthWrite:    false,
      transparent:   true,
      opacity:       0.9,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // ── Radial pulse ring ─────────────────────────────────────────────────────
    const ringGeo  = new THREE.RingGeometry(0.95, 1.00, 64);
    const ringMat  = new THREE.MeshBasicMaterial({
      color:     0x00e5ff,
      side:      THREE.DoubleSide,
      blending:  THREE.AdditiveBlending,
      transparent: true,
      opacity:   0.0,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    scene.add(ring);

    // ── Animation loop ────────────────────────────────────────────────────────
    const posAttr    = geo.attributes["position"] as THREE.BufferAttribute;
    const colorAttr  = geo.attributes["color"]    as THREE.BufferAttribute;

    let rafId    = 0;
    let tLast    = 0;
    let tElapsed = 0;

    function tick(ts: number) {
      const dt = Math.min((ts - tLast) / 1000, 0.05);
      tLast    = ts;
      tElapsed += dt;

      const playing  = isPlayingRef.current;
      const speed    = playing ? 0.55 : 0.18;
      const noiseAmp = playing ? 0.28 : 0.10;

      // Update particle positions via simplex noise
      for (let i = 0; i < NUM_PARTICLES; i++) {
        const ox = seeds[i * 3]!;
        const oy = seeds[i * 3 + 1]!;
        const oz = seeds[i * 3 + 2]!;

        const t  = tElapsed * speed;
        const nx = simplex3(ox + t * 0.4,  oy,          oz) * noiseAmp;
        const ny = simplex3(ox,            oy + t * 0.3, oz) * noiseAmp;
        const nz = simplex3(ox,            oy,          oz + t * 0.5) * noiseAmp * 0.5;

        const base_x = positions[i * 3]!;
        const base_y = positions[i * 3 + 1]!;
        const base_z = positions[i * 3 + 2]!;

        const r    = Math.sqrt(base_x * base_x + base_z * base_z) || 0.001;
        const pulse = 0.04 * Math.sin(tElapsed * 1.1 - r * 2.2);

        posAttr.setXYZ(
          i,
          base_x + nx + (base_x / r) * pulse,
          base_y + ny,
          base_z + nz + (base_z / r) * pulse,
        );

        // Shift color over time
        lerpColor(tmpColor, (i / NUM_PARTICLES + tElapsed * 0.04) % 1);
        colorAttr.setXYZ(i, tmpColor.r, tmpColor.g, tmpColor.b);
      }

      posAttr.needsUpdate   = true;
      colorAttr.needsUpdate = true;

      // Radial pulse ring
      const ringPhase  = (tElapsed * 0.7) % (Math.PI * 2);
      const ringScale  = 1 + 0.18 * Math.sin(ringPhase);
      ring.scale.setScalar(ringScale);
      ringMat.opacity  = playing
        ? 0.18 + 0.12 * Math.sin(tElapsed * 1.4)
        : 0.06 + 0.04 * Math.sin(tElapsed * 0.8);

      // Slow camera drift
      camera.position.x = Math.sin(tElapsed * 0.07) * 0.18;
      camera.position.y = Math.cos(tElapsed * 0.05) * 0.10;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []); // intentionally empty — reads isPlaying from ref each frame

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ background: "#000" }}
    />
  );
}
