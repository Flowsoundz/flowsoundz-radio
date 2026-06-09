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

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || (isVercel ? ".next" : ".next-runtime"),
  outputFileTracingRoot: path.resolve(__dirname),
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
