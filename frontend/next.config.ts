import path from "node:path";
import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";

function getBackendCoverPattern(): RemotePattern | null {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE;

  if (!apiBase) {
    return null;
  }

  try {
    const parsed = new URL(apiBase);
    return {
      protocol:
        parsed.protocol === "https:" ? "https" : "http",
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: "/covers/**",
    };
  } catch {
    return null;
  }
}

const backendCoverPattern = getBackendCoverPattern();
const isVercel = Boolean(process.env.VERCEL);
const isDev = process.env.NODE_ENV === "development";

// External origins the app legitimately loads assets from
const coverOrigin = backendCoverPattern
  ? `${backendCoverPattern.protocol}://${backendCoverPattern.hostname}${backendCoverPattern.port ? `:${backendCoverPattern.port}` : ""}`
  : "";

function buildCsp(frameAncestors: string, opts?: { wasm?: boolean }): string {
  // The Visualizer Studio runs ffmpeg.wasm to transcode promo videos to MP4 in
  // the browser. WASM compilation needs 'wasm-unsafe-eval'; the worker pulls the
  // self-hosted core (/ffmpeg/*) and blob: handles its module/worker plumbing.
  const wasm = opts?.wasm ?? false;
  return [
    "default-src 'self'",
    // Next.js injects inline bootstrap scripts; dev mode additionally needs eval for HMR
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${wasm ? " 'wasm-unsafe-eval' blob:" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    // https: needed — cover art can live on external storage hosts (DB coverUrl)
    `img-src 'self' data: blob: https:${coverOrigin && !coverOrigin.startsWith("https") ? ` ${coverOrigin}` : ""}`,
    // DJ drops arrive as data:audio/mpeg URLs; blob: for Web Audio processing;
    // https: because public_audio_url can point at external storage/CDN hosts
    "media-src 'self' data: blob: https:",
    `connect-src 'self'${wasm ? " blob:" : ""}`,
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com",
    `frame-ancestors ${frameAncestors}`,
  ].join("; ");
}

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || (isVercel ? ".next" : ".next-runtime"),
  // Retired Creator Hub pages — edge-level redirects run before any page cache,
  // so they're reliable where page-component redirect() got served from stale
  // edge cache. releases→drops (duplicate scheduler), release-submit→submit
  // (legacy intake that bypassed AI promo + curation).
  async redirects() {
    return [
      { source: "/artist/releases", destination: "/artist/drops", permanent: true },
      { source: "/artist/release-submit", destination: "/artist/submit", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // Embed player must remain frameable on third-party sites
        source: "/embed/:path*",
        headers: [
          { key: "Content-Security-Policy", value: buildCsp("*") },
        ],
      },
      {
        // Visualizer Studio: same lockdown + WASM (ffmpeg.wasm promo export)
        source: "/visualizer",
        headers: [
          { key: "Content-Security-Policy", value: buildCsp("'self'", { wasm: true }) },
        ],
      },
      {
        // All other pages: lock down sources, framing only by the site itself
        source: "/((?!embed|visualizer|api/).*)",
        headers: [
          { key: "Content-Security-Policy", value: buildCsp("'self'") },
        ],
      },
      {
        // Audio stream routes — only the site itself should embed these
        source: "/api/stream/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "https://www.flowsoundzradio.com" },
          { key: "Vary", value: "Origin" },
        ],
      },
      {
        source: "/audio/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "https://www.flowsoundzradio.com" },
          { key: "Vary", value: "Origin" },
        ],
      },
      {
        source: "/api/sse/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "https://www.flowsoundzradio.com" },
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Accel-Buffering", value: "no" },
        ],
      },
    ];
  },
  outputFileTracingRoot: path.resolve(__dirname),
  // Keep large static media OUT of serverless function bundles. These files
  // still serve normally from /public as static assets — without this, the
  // ~470MB of audio/covers gets traced into every lambda and blows the 245MB
  // bundle limit, failing the deploy.
  outputFileTracingExcludes: {
    "*": [
      "./public/audio/**",
      "./public/archive/**",
      "./public/covers/**",
      "./public/drops/**",
      "./public/visuals/**",
    ],
  },
  serverExternalPackages: [
    "@anthropic-ai/sdk",
    "@prisma/client",
    "prisma",
    "nodemailer",
    "sharp",
    "openai",
  ],
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/covers/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/covers/**",
      },
      ...(backendCoverPattern ? [backendCoverPattern] : []),
    ],
  },
};

export default nextConfig;
