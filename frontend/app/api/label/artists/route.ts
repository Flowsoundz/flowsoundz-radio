import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function getLabelForUser(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, labelManagers: { select: { labelId: true, label: { select: { maxArtists: true } } } } },
  });
  if (!user || user.labelManagers.length === 0) return null;
  return { userId: user.id, labelId: user.labelManagers[0]!.labelId, maxArtists: user.labelManagers[0]!.label.maxArtists };
}

// POST — add artist to label (by artistId or artist email)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ error: "Not authenticated." }, { status: 401 });

  const mgr = await getLabelForUser(session.user.email);
  if (!mgr) return Response.json({ error: "No label found for this account." }, { status: 404 });

  let body: { artistId?: string; artistEmail?: string };
  try { body = (await req.json()) as typeof body; }
  catch { return Response.json({ error: "Invalid body." }, { status: 400 }); }

  // Resolve artist
  let artistId = body.artistId;
  if (!artistId && body.artistEmail) {
    const a = await prisma.artist.findFirst({ where: { email: body.artistEmail }, select: { id: true } });
    if (!a) return Response.json({ error: "Artist not found with that email." }, { status: 404 });
    artistId = a.id;
  }
  if (!artistId) return Response.json({ error: "artistId or artistEmail required." }, { status: 422 });

  // Check slot limit
  const count = await prisma.labelArtist.count({ where: { labelId: mgr.labelId } });
  if (count >= mgr.maxArtists) {
    return Response.json({ error: `Your label tier allows up to ${mgr.maxArtists} artists. Upgrade to add more.` }, { status: 403 });
  }

  const link = await prisma.labelArtist.upsert({
    where: { labelId_artistId: { labelId: mgr.labelId, artistId } },
    update: {},
    create: { labelId: mgr.labelId, artistId },
  });

  return Response.json({ link }, { status: 201 });
}

// DELETE — remove artist from label
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ error: "Not authenticated." }, { status: 401 });

  const mgr = await getLabelForUser(session.user.email);
  if (!mgr) return Response.json({ error: "No label found." }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const artistId = searchParams.get("artistId");
  if (!artistId) return Response.json({ error: "artistId required." }, { status: 422 });

  await prisma.labelArtist.deleteMany({ where: { labelId: mgr.labelId, artistId } });
  return Response.json({ ok: true });
}
