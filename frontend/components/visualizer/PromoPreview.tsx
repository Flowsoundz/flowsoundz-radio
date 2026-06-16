"use client";

import { useEffect, useRef } from "react";
import { drawPromoFrame, type PromoDrawOptions } from "@/lib/promoVideo";

type Props = PromoDrawOptions & {
  analyser: AnalyserNode | null;
  audioEl: HTMLAudioElement | null;
  isPlaying: boolean;
  lyrics?: { text: string; start: number }[];
};

// Live, true-WYSIWYG preview of the exported promo: it renders through the exact
// same drawPromoFrame the MP4 export uses. Real spectrum while the track plays;
// a gentle synthetic shimmer when idle so the framing is always visible.
export function PromoPreview(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Keep latest props in a ref so the single rAF loop never goes stale.
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let bassSmooth = 0;
    const freq = new Uint8Array(2048);

    const loop = () => {
      const p = propsRef.current;
      if (canvas.width !== p.width) canvas.width = p.width;
      if (canvas.height !== p.height) canvas.height = p.height;

      const t = performance.now() / 1000;
      let bass = 0;
      if (p.analyser && p.isPlaying) {
        const data = new Uint8Array(p.analyser.frequencyBinCount);
        p.analyser.getByteFrequencyData(data);
        freq.set(data.subarray(0, freq.length));
        let s = 0;
        for (let i = 0; i < 8; i++) s += data[i] ?? 0;
        bass = s / 8 / 255;
      } else {
        // Idle shimmer — smooth, low-amplitude synthetic spectrum.
        for (let i = 0; i < freq.length; i++) {
          const falloff = 1 - i / freq.length;
          freq[i] = Math.max(0, Math.min(255, 70 * falloff * (1 + Math.sin(i * 0.12 + t * 1.6))));
        }
        bass = 0.25 + 0.15 * (0.5 + 0.5 * Math.sin(t * 1.4));
      }
      bassSmooth = bassSmooth * 0.82 + bass * 0.18;

      // Active lyric: by playback time while playing; a sample line when idle.
      let activeLyric: string | null = null;
      if (p.lyrics && p.lyrics.length) {
        if (p.isPlaying && p.audioEl) {
          const ct = p.audioEl.currentTime;
          for (const cue of p.lyrics) {
            if (cue.start <= ct + 0.05) activeLyric = cue.text;
            else break;
          }
        } else {
          activeLyric = p.lyrics[0]?.text ?? null;
        }
      }

      drawPromoFrame(ctx, p, freq, bassSmooth, activeLyric);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={props.width}
      height={props.height}
      className="h-full w-full object-contain"
    />
  );
}
