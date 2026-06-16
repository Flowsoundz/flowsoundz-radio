// In-browser branded promo-video export for the Visualizer Studio.
//
// Renders a purpose-built, fully-branded audio-reactive promo onto a canvas at
// social resolution, records canvas + audio via MediaRecorder, then transcodes
// to MP4 with ffmpeg.wasm (self-hosted core at /ffmpeg/*) so the clip posts
// directly to Reels / TikTok / Shorts. Every frame carries the FlowSoundz
// wordmark + "Now on FlowSoundz Radio" + the artist's page link — so each export
// markets the artist and the station.

export type PromoTheme = { bg: string; accent: string; accent2: string };

// The fields drawPromoFrame needs — shared by export and the live preview so
// both render through the exact same code path (true WYSIWYG).
export type PromoDrawOptions = {
  width: number;
  height: number;
  theme: PromoTheme;
  artistName: string;
  trackTitle: string;
  pageUrl: string;
  cover?: HTMLImageElement | null;
  logo?: HTMLImageElement | null;
};

export type PromoExportOptions = {
  audioEl: HTMLAudioElement;
  audioContext: AudioContext;
  analyser: AnalyserNode;
  width: number;
  height: number;
  fps?: number;
  durationMs: number;
  artistName: string;
  trackTitle: string;
  theme: PromoTheme;
  cover?: HTMLImageElement | null;
  logo?: HTMLImageElement | null;
  pageUrl: string;
  /** Time-cued lyric lines (start in seconds from track start). The line whose
   *  start is the latest <= current playback time is shown, karaoke-style. */
  lyrics?: { text: string; start: number }[];
  onProgress?: (phase: "recording" | "transcoding", pct: number) => void;
  signal?: AbortSignal;
};

function pickRecorderMime(): { mime: string; isMp4: boolean } | null {
  const candidates: Array<{ mime: string; isMp4: boolean }> = [
    { mime: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", isMp4: true },
    { mime: "video/webm;codecs=vp9,opus", isMp4: false },
    { mime: "video/webm;codecs=vp8,opus", isMp4: false },
    { mime: "video/webm", isMp4: false },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mime)) return c;
  }
  return null;
}

// Round-rect helper (older Safari lacks ctx.roundRect).
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines - 1) break;
    } else {
      cur = test;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines.slice(0, maxLines);
}

export function drawPromoFrame(
  ctx: CanvasRenderingContext2D,
  o: PromoDrawOptions,
  freq: Uint8Array,
  bass: number,
  activeLyric: string | null,
) {
  const { width: W, height: H, theme } = o;
  const cx = W / 2;
  const cy = H * 0.42;
  // Size everything off the short edge so the layout holds across 9:16, 1:1, 16:9.
  const base = Math.min(W, H);

  // ── Background ──
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, theme.bg);
  bg.addColorStop(1, "#02040a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Bass-reactive central glow.
  const glowR = Math.min(W, H) * (0.28 + bass * 0.22);
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
  glow.addColorStop(0, `${theme.accent}33`);
  glow.addColorStop(0.5, `${theme.accent2}1a`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // ── Circular spectrum ──
  const bars = 96;
  const baseR = Math.min(W, H) * 0.20;
  const maxLen = Math.min(W, H) * 0.16;
  const step = Math.floor(freq.length / 2 / bars) || 1;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineCap = "round";
  for (let i = 0; i < bars; i++) {
    const v = freq[i * step] / 255;
    const len = 6 + v * maxLen;
    // mirror across vertical axis for symmetry
    for (const sign of [1, -1]) {
      const ang = sign * (i / bars) * Math.PI - Math.PI / 2;
      const x1 = Math.cos(ang) * baseR;
      const y1 = Math.sin(ang) * baseR;
      const x2 = Math.cos(ang) * (baseR + len);
      const y2 = Math.sin(ang) * (baseR + len);
      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, theme.accent);
      grad.addColorStop(1, theme.accent2);
      ctx.strokeStyle = grad;
      ctx.globalAlpha = 0.35 + v * 0.65;
      ctx.lineWidth = (base / 1080) * 6;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // ── Center artwork (cover or logo) ──
  const artR = baseR * 0.82;
  ctx.save();
  ctx.translate(cx, cy);
  if (o.cover) {
    ctx.save();
    roundRect(ctx, -artR, -artR, artR * 2, artR * 2, artR * 0.28);
    ctx.clip();
    ctx.drawImage(o.cover, -artR, -artR, artR * 2, artR * 2);
    ctx.restore();
    ctx.lineWidth = (base / 1080) * 3;
    ctx.strokeStyle = `${theme.accent}66`;
    roundRect(ctx, -artR, -artR, artR * 2, artR * 2, artR * 0.28);
    ctx.stroke();
  } else if (o.logo) {
    const lw = artR * 1.8;
    const lh = (lw * o.logo.height) / (o.logo.width || 1);
    ctx.globalAlpha = 0.96;
    ctx.drawImage(o.logo, -lw / 2, -lh / 2, lw, lh);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // ── Top wordmark ──
  const pad = base * 0.06;
  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.font = `600 ${Math.round(base * 0.026)}px system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText("FLOWSOUNDZ RADIO", pad, pad);

  // ── Bottom branded scrim ──
  const scrimTop = H * 0.62;
  const scrim = ctx.createLinearGradient(0, scrimTop, 0, H);
  scrim.addColorStop(0, "transparent");
  scrim.addColorStop(0.45, "rgba(2,4,10,0.72)");
  scrim.addColorStop(1, "rgba(2,4,10,0.96)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, scrimTop, W, H - scrimTop);

  // ── Active lyric line (karaoke-style), centered above the artist block ──
  if (activeLyric) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.round(base * 0.05)}px system-ui, -apple-system, sans-serif`;
    const lines = wrapLines(ctx, activeLyric, W * 0.86, 2);
    const lineH = base * 0.066;
    const startY = H * 0.72 - ((lines.length - 1) * lineH) / 2;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.85)";
    ctx.shadowBlur = base * 0.02;
    lines.forEach((ln, i) => {
      ctx.fillStyle = "#ffffff";
      ctx.fillText(ln, W / 2, startY + i * lineH);
    });
    ctx.restore();
  }

  ctx.textAlign = "left";
  // Artist name
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 ${Math.round(base * 0.072)}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(truncate(ctx, o.artistName || "FlowSoundz", W - pad * 2), pad, H * 0.83);
  // Track title
  ctx.fillStyle = "rgba(226,232,240,0.82)";
  ctx.font = `500 ${Math.round(base * 0.04)}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(truncate(ctx, o.trackTitle || "New release", W - pad * 2), pad, H * 0.88);

  // "Now on FlowSoundz Radio" pill
  const pillY = H * 0.91;
  const pillH = base * 0.066;
  ctx.font = `700 ${Math.round(base * 0.03)}px system-ui, -apple-system, sans-serif`;
  const label = "● NOW ON FLOWSOUNDZ RADIO";
  const tw = ctx.measureText(label).width;
  const pillW = tw + base * 0.06;
  const pg = ctx.createLinearGradient(pad, 0, pad + pillW, 0);
  pg.addColorStop(0, theme.accent);
  pg.addColorStop(1, theme.accent2);
  ctx.fillStyle = pg;
  roundRect(ctx, pad, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = "#06121f";
  ctx.textBaseline = "middle";
  ctx.fillText(label, pad + base * 0.03, pillY + pillH / 2 + 1);

  // Page URL
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = `600 ${Math.round(base * 0.026)}px system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(o.pageUrl, pad, H * 0.965);
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t}…`;
}

async function transcodeToMp4(
  webm: Blob,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { fetchFile, toBlobURL } = await import("@ffmpeg/util");
  const ffmpeg = new FFmpeg();
  ffmpeg.on("progress", ({ progress }) => onProgress?.(Math.min(0.99, Math.max(0, progress))));

  const base = "/ffmpeg";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
  });
  if (signal?.aborted) throw new DOMException("aborted", "AbortError");

  await ffmpeg.writeFile("in.webm", await fetchFile(webm));
  await ffmpeg.exec([
    "-i", "in.webm",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "160k",
    "-movflags", "+faststart",
    "out.mp4",
  ]);
  const data = (await ffmpeg.readFile("out.mp4")) as Uint8Array;
  ffmpeg.terminate();
  return new Blob([data as unknown as BlobPart], { type: "video/mp4" });
}

export async function exportPromoVideo(o: PromoExportOptions): Promise<Blob> {
  const fps = o.fps ?? 30;
  const canvas = document.createElement("canvas");
  canvas.width = o.width;
  canvas.height = o.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable.");

  // Tap audio for the recording without disturbing live monitoring.
  const streamDest = o.audioContext.createMediaStreamDestination();
  o.analyser.connect(streamDest);

  const videoStream = canvas.captureStream(fps);
  const audioTrack = streamDest.stream.getAudioTracks()[0];
  if (audioTrack) videoStream.addTrack(audioTrack);

  const picked = pickRecorderMime();
  if (!picked) {
    o.analyser.disconnect(streamDest);
    throw new Error("This browser can't record video. Try Chrome or Edge.");
  }

  const recorder = new MediaRecorder(videoStream, {
    mimeType: picked.mime,
    videoBitsPerSecond: 10_000_000,
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const freq = new Uint8Array(o.analyser.frequencyBinCount);
  let raf = 0;
  let bassSmooth = 0;
  const render = () => {
    o.analyser.getByteFrequencyData(freq);
    let bassSum = 0;
    const bassBins = Math.min(8, freq.length);
    for (let i = 0; i < bassBins; i++) bassSum += freq[i];
    const bass = bassSum / bassBins / 255;
    bassSmooth = bassSmooth * 0.8 + bass * 0.2;

    let activeLyric: string | null = null;
    if (o.lyrics && o.lyrics.length) {
      const t = o.audioEl.currentTime;
      for (const cue of o.lyrics) {
        if (cue.start <= t + 0.05) activeLyric = cue.text;
        else break;
      }
    }

    drawPromoFrame(ctx, o, freq, bassSmooth, activeLyric);
    raf = requestAnimationFrame(render);
  };

  const cleanup = () => {
    cancelAnimationFrame(raf);
    try {
      o.analyser.disconnect(streamDest);
    } catch {
      /* already disconnected */
    }
  };

  const recordedWebm = await new Promise<Blob>((resolve, reject) => {
    const onAbort = () => {
      try {
        recorder.stop();
      } catch {
        /* noop */
      }
      cleanup();
      reject(new DOMException("aborted", "AbortError"));
    };
    o.signal?.addEventListener("abort", onAbort, { once: true });

    recorder.onstop = () => {
      cleanup();
      o.signal?.removeEventListener("abort", onAbort);
      resolve(new Blob(chunks, { type: picked.mime }));
    };
    recorder.onerror = () => {
      cleanup();
      reject(new Error("Recording failed."));
    };

    // Rewind + play the track, record for the chosen duration.
    o.audioEl.currentTime = 0;
    const start = performance.now();
    void o.audioEl.play().catch(() => undefined);
    recorder.start(250);
    render();

    const tick = () => {
      const elapsed = performance.now() - start;
      o.onProgress?.("recording", Math.min(1, elapsed / o.durationMs));
      if (elapsed >= o.durationMs || o.audioEl.ended) {
        o.audioEl.pause();
        try {
          recorder.stop();
        } catch {
          /* noop */
        }
        return;
      }
      window.setTimeout(tick, 200);
    };
    window.setTimeout(tick, 200);
  });

  // Already MP4 from the recorder? Done.
  if (picked.isMp4) return recordedWebm;

  return transcodeToMp4(recordedWebm, (p) => o.onProgress?.("transcoding", p), o.signal);
}
