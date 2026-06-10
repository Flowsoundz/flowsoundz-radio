import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function findArtistBySession() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  return prisma.artist.findFirst({
    where: { email },
    include: {
      profile: true,
      socialLinks: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      supportLinks: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });
}

export async function GET() {
  const artist = await findArtistBySession();
  if (!artist) return Response.json({ error: "No artist found for this account." }, { status: 404 });
  return Response.json({ artist });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return Response.json({ error: "Not authenticated." }, { status: 401 });

  let body: {
    name?: string;
    bio?: string;
    statement?: string;
    rootsLabel?: string;
    payoutEmail?: string;
    socialLinks?: Record<string, string>;
    supportLinks?: Array<{ platform: string; label: string; url: string; isPrimary?: boolean }>;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  const artist = await prisma.artist.findFirst({ where: { email } });
  if (!artist) return Response.json({ error: "No artist found for this account." }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    // Update core artist fields
    if (body.name || body.bio !== undefined || body.payoutEmail !== undefined) {
      await tx.artist.update({
        where: { id: artist.id },
        data: {
          ...(body.name ? { name: body.name.trim() } : {}),
          ...(body.bio !== undefined ? { bio: body.bio.trim() } : {}),
          ...(body.payoutEmail !== undefined ? { payoutEmail: body.payoutEmail.trim() || null } : {}),
        },
      });
    }

    // Upsert ArtistProfile
    if (body.statement !== undefined || body.rootsLabel !== undefined) {
      await tx.artistProfile.upsert({
        where: { artistId: artist.id },
        create: {
          artistId: artist.id,
          statement: body.statement?.trim() ?? null,
          rootsLabel: body.rootsLabel?.trim() ?? null,
        },
        update: {
          ...(body.statement !== undefined ? { statement: body.statement.trim() } : {}),
          ...(body.rootsLabel !== undefined ? { rootsLabel: body.rootsLabel.trim() } : {}),
        },
      });
    }

    // Replace social links
    if (body.socialLinks) {
      await tx.artistSocialLink.deleteMany({ where: { artistId: artist.id } });
      const entries = Object.entries(body.socialLinks).filter(([, url]) => url?.trim());
      for (let i = 0; i < entries.length; i++) {
        const [platform, url] = entries[i];
        await tx.artistSocialLink.create({
          data: {
            artistId: artist.id,
            platform: platform.toUpperCase() as never,
            url: url.trim(),
            sortOrder: i,
          },
        });
      }
    }

    // Replace support links
    if (body.supportLinks) {
      await tx.artistSupportLink.deleteMany({ where: { artistId: artist.id } });
      for (let i = 0; i < body.supportLinks.length; i++) {
        const link = body.supportLinks[i];
        if (!link.url?.trim()) continue;
        await tx.artistSupportLink.create({
          data: {
            artistId: artist.id,
            platform: link.platform.toUpperCase() as never,
            label: link.label?.trim() || null,
            url: link.url.trim(),
            isPrimary: link.isPrimary ?? i === 0,
            sortOrder: i,
          },
        });
      }
    }
  });

  return Response.json({ ok: true });
}
