// Resolve "whatever the artist pasted" into a directly-fetchable audio URL.
//
// People paste share pages (suno.com/s/abc, udio.com/songs/xyz) because that's
// what the platforms put on their clipboard. Those are HTML, not audio — the
// mastering worker can't use them. This resolver fetches the page server-side
// and extracts the real CDN file (Suno exposes it in the page markup / og:audio),
// so share links Just Work instead of failing with an ffmpeg error.

const DIRECT_AUDIO_PATH = /\.(mp3|wav|m4a|aac|flac|ogg|opus)(\?|$)/i;
// Known audio CDN hosts — pathname has no extension but serves audio.
const KNOWN_AUDIO_HOST = /(^|\.)(cdn\d*\.suno\.ai|audiopipe\.suno\.ai|cdn\.udio\.com|[^.]+\.public\.blob\.vercel-storage\.com)$/i;
// Audio file URLs embedded in a share page's HTML/JSON.
const EMBEDDED_AUDIO_URL =
  /https?:\/\/(?:cdn\d*\.suno\.ai|audiopipe\.suno\.ai|cdn\.udio\.com)\/[A-Za-z0-9\-_/]+\.(?:mp3|wav|m4a)/g;

export type ResolvedAudio = {
  url: string;
  /** Set when the input was a share page we resolved, for surfacing in UI/logs. */
  resolvedFrom?: string;
};

export function looksLikeDirectAudioUrl(input: string): boolean {
  try {
    const u = new URL(input);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return DIRECT_AUDIO_PATH.test(u.pathname) || KNOWN_AUDIO_HOST.test(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Returns a direct audio URL, resolving share pages when needed.
 * Returns null only when the input is not http(s) at all — an unresolvable
 * page is returned as-is so the worker can give a precise error.
 */
export async function resolveDirectAudioUrl(input: string): Promise<ResolvedAudio | null> {
  const trimmed = input.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  if (looksLikeDirectAudioUrl(trimmed)) return { url: trimmed };

  try {
    const res = await fetch(trimmed, {
      redirect: "follow",
      headers: {
        // Some platforms gate bot UAs away from the full page markup.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,*/*",
      },
      signal: AbortSignal.timeout(10_000),
    });
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.startsWith("audio/")) return { url: trimmed };
    if (!contentType.includes("text/html") && !contentType.includes("application/json")) {
      return { url: trimmed };
    }

    const html = await res.text();
    const embedded = [...new Set(html.match(EMBEDDED_AUDIO_URL) ?? [])];
    if (embedded.length > 0) {
      // Share pages also embed utility clips (e.g. Suno's sil-100.mp3 silence
      // asset). The actual track is the UUID-named file — prefer it.
      const uuidNamed = embedded.find((u) =>
        /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:mp3|wav|m4a)$/i.test(u),
      );
      const best = uuidNamed ?? embedded.find((u) => !/\/sil-\d+\.mp3$/i.test(u)) ?? embedded[0];
      return { url: best, resolvedFrom: trimmed };
    }

    const og =
      html.match(/property=["']og:audio(?::url)?["'][^>]*content=["']([^"']+)["']/i) ??
      html.match(/content=["']([^"']+)["'][^>]*property=["']og:audio(?::url)?["']/i);
    if (og?.[1] && /^https?:\/\//i.test(og[1])) return { url: og[1], resolvedFrom: trimmed };
  } catch {
    // Network/timeout — fall through; worker will report the fetch error.
  }

  return { url: trimmed };
}
