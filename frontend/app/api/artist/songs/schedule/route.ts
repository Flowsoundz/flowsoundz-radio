import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return Response.json({ error: "Not authenticated." }, { status: 401 });

  let body: { songId?: string; memberReleaseAt?: string | null; publicReleaseAt?: string | null };
  try { body = (await request.json()) as typeof body; }
  catch { return Response.json({ error: "Invalid body." }, { status: 400 }); }

  if (!body.songId) return Response.json({ error: "songId required." }, { status: 400 });

  // Verify the song belongs to an artist linked to this email
  const song = await prisma.song.findFirst({
    where: { id: body.songId, artist: { email } },
  });
  if (!song) return Response.json({ error: "Song not found." }, { status: 404 });

  await prisma.song.update({
    where: { id: body.songId },
    data: {
      memberReleaseAt: body.memberReleaseAt ? new Date(body.memberReleaseAt) : null,
      publicReleaseAt: body.publicReleaseAt ? new Date(body.publicReleaseAt) : null,
    },
  });

  return Response.json({ ok: true });
}
