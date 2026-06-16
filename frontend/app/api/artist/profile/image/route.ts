import type { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

// Uploads an artist's hero/profile image to the public Blob store and saves the
// URL on ArtistProfile.heroImageUrl. That field already flows into the catalog
// snapshot → the public artist page + OG share card + promo-video defaults.
export async function POST(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return Response.json({ error: "Not authenticated." }, { status: 401 });

  const token = process.env.MASTERS_BLOB_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return Response.json({ error: "Image storage is not configured." }, { status: 503 });

  const artist = await prisma.artist.findFirst({ where: { email }, select: { id: true } });
  if (!artist) return Response.json({ error: "No artist linked to this account." }, { status: 404 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof Blob)) return Response.json({ error: "No image provided." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Image too large (8 MB max)." }, { status: 413 });
  if (file.type && !ALLOWED.includes(file.type)) {
    return Response.json({ error: "Use a JPG, PNG, or WebP image." }, { status: 415 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  try {
    const blob = await put(`artist-images/${artist.id}-${Date.now()}.${ext}`, file, {
      access: "public",
      token,
      contentType: file.type || "image/jpeg",
      addRandomSuffix: false,
    });
    await prisma.artistProfile.upsert({
      where: { artistId: artist.id },
      create: { artistId: artist.id, heroImageUrl: blob.url },
      update: { heroImageUrl: blob.url },
    });
    return Response.json({ url: blob.url });
  } catch (err) {
    console.error("[artist/profile/image]", err);
    return Response.json({ error: "Upload failed. Try again." }, { status: 500 });
  }
}
