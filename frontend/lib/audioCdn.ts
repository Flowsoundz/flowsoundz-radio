// Maps the legacy in-repo audio paths (/audio/*.mp3, /archive/*.mp3) to the
// public Blob CDN so the 440MB of MP3s no longer have to live in the build.
//
// Set NEXT_PUBLIC_AUDIO_CDN_BASE to the Blob store base (no trailing slash),
// e.g. https://ay8hrqgzwva5rn6p.public.blob.vercel-storage.com. The catalog
// keeps its "/audio/x.mp3" paths as the source of truth; this rewrites them at
// load time. When the env is unset (or the URL is already absolute), the path
// is returned untouched — so local dev still works against /public if the
// files happen to be present.
const BASE = (process.env.NEXT_PUBLIC_AUDIO_CDN_BASE ?? "").replace(/\/+$/, "");

export function toCdnAudioUrl<T extends string | null | undefined>(path: T): T {
  if (!path) return path;
  if (!BASE) return path;
  if (/^https?:\/\//i.test(path)) return path; // already a full URL (DB/Blob tracks)
  if (path.startsWith("/audio/") || path.startsWith("/archive/")) {
    return `${BASE}${path}` as T;
  }
  return path;
}
