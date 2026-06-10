import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// DELETE /api/artist/posts/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return Response.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await params;

  const artist = await prisma.artist.findFirst({ where: { email }, select: { id: true } });
  if (!artist) return Response.json({ error: "No artist." }, { status: 404 });

  const post = await prisma.artistPost.findUnique({ where: { id }, select: { artistId: true } });
  if (!post || post.artistId !== artist.id) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  await prisma.artistPost.delete({ where: { id } });
  return Response.json({ ok: true });
}
