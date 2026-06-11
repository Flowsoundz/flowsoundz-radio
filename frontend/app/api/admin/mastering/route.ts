import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  return Boolean(session?.user && (session.user as { isAdmin?: boolean }).isAdmin);
}

// GET — mastering pipeline status: counts per packagingStatus + recent jobs.
export async function GET() {
  if (!(await requireAdmin())) return Response.json({ error: "Forbidden" }, { status: 403 });

  const [pending, processing, ready, failed, recent] = await Promise.all([
    prisma.song.count({ where: { packagingStatus: "PENDING" } }),
    prisma.song.count({ where: { packagingStatus: "PROCESSING" } }),
    prisma.song.count({ where: { packagingStatus: "READY" } }),
    prisma.song.count({ where: { packagingStatus: "FAILED" } }),
    prisma.song.findMany({
      where: { packagingStatus: { in: ["PENDING", "PROCESSING", "FAILED"] } },
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: {
        id: true,
        title: true,
        packagingStatus: true,
        packagingError: true,
        sourceAudioUrl: true,
        durationSec: true,
        updatedAt: true,
        artist: { select: { name: true } },
      },
    }),
  ]);

  return Response.json({
    counts: { pending, processing, ready, failed },
    jobs: recent.map((s) => ({
      id: s.id,
      title: s.title,
      artist: s.artist?.name ?? "",
      status: s.packagingStatus,
      error: s.packagingError,
      sourceAudioUrl: s.sourceAudioUrl,
      durationSec: s.durationSec,
      updatedAt: s.updatedAt.toISOString(),
    })),
  });
}

// POST { songId } — requeue a FAILED job (FAILED → PENDING) so the worker
// re-picks it. Optionally swap the source URL when the original was bad.
export async function POST(req: Request) {
  if (!(await requireAdmin())) return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: { songId?: unknown; sourceAudioUrl?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }
  const songId = typeof body.songId === "string" ? body.songId : "";
  if (!songId) return Response.json({ error: "songId required" }, { status: 400 });

  const newSource = typeof body.sourceAudioUrl === "string" ? body.sourceAudioUrl.trim() : "";

  const song = await prisma.song.findUnique({ where: { id: songId }, select: { packagingStatus: true } });
  if (!song) return Response.json({ error: "Not found" }, { status: 404 });
  if (song.packagingStatus !== "FAILED") {
    return Response.json({ error: "Only FAILED jobs can be retried." }, { status: 409 });
  }

  await prisma.song.update({
    where: { id: songId },
    data: {
      packagingStatus: "PENDING",
      packagingError: null,
      ...(newSource ? { sourceAudioUrl: newSource, audioUrl: newSource } : {}),
    },
  });

  return Response.json({ ok: true });
}
