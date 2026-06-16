import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugifyArtistName } from "@/lib/catalogSnapshot";
import { resolveDirectAudioUrl } from "@/lib/resolveAudioSource";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VIBES = ["CHILL", "HYPE", "LATE_NIGHT", "EMOTIONAL", "UNSURE"] as const;
type Vibe = (typeof VIBES)[number];

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    // strip combining diacritical marks (U+0300–U+036F)
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Enqueue a track for the mastering worker. Accepts a Suno/Udio export URL (or
// any direct audio URL) and creates a PENDING song; the worker loudness-masters
// it, fills publicAudioUrl + durationSec, and flips it to READY.
// Reject loopback / private / link-local / metadata hosts to prevent SSRF via
// the server-side fetch in resolveDirectAudioUrl.
function isBlockedHost(urlStr: string): boolean {
  try {
    const h = new URL(urlStr).hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
    if (h === "0.0.0.0" || h === "::1") return true;
    if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
    return false;
  } catch {
    return true;
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  const title = str(body.title);
  const artistName = str(body.artist) || "FlowSoundz";
  const genre = str(body.genre) || "Independent";
  const sourceAudioUrl = str(body.sourceAudioUrl);
  const vibe = (VIBES as readonly string[]).includes(str(body.vibe).toUpperCase())
    ? (str(body.vibe).toUpperCase() as Vibe)
    : "HYPE";

  if (!title) return Response.json({ error: "title required" }, { status: 400 });
  if (!sourceAudioUrl || !/^https?:\/\//.test(sourceAudioUrl)) {
    return Response.json({ error: "sourceAudioUrl must be an http(s) URL" }, { status: 400 });
  }
  // SSRF guard: this URL is fetched server-side (resolveDirectAudioUrl), so
  // refuse loopback / private / link-local hosts and cloud metadata endpoints.
  if (isBlockedHost(sourceAudioUrl)) {
    return Response.json({ error: "That host isn't allowed." }, { status: 400 });
  }

  // Share links (suno.com/s/..., etc.) are HTML pages, not audio — resolve
  // them to the underlying CDN file so artists can paste whatever they have.
  const resolved = await resolveDirectAudioUrl(sourceAudioUrl);
  const finalAudioUrl = resolved?.url ?? sourceAudioUrl;

  try {
    // Resolve or create the artist by slug.
    const artistSlug = slugifyArtistName(artistName);
    const artist = await prisma.artist.upsert({
      where: { slug: artistSlug },
      create: { name: artistName, slug: artistSlug },
      update: {},
    });

    // Unique song slug — append a short suffix on collision.
    const base = slugify(title) || "track";
    let slug = base;
    if (await prisma.song.findUnique({ where: { slug } })) {
      slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const song = await prisma.song.create({
      data: {
        artistId: artist.id,
        title,
        slug,
        genre,
        vibe,
        audioUrl: finalAudioUrl, // placeholder; worker writes publicAudioUrl
        sourceAudioUrl: finalAudioUrl,
        packagingStatus: "PENDING",
      },
      select: { id: true, slug: true, title: true, packagingStatus: true },
    });

    return Response.json({ ok: true, song });
  } catch (err) {
    console.error("[admin/ingest]", err);
    return Response.json({ error: "Failed to enqueue track." }, { status: 500 });
  }
}
