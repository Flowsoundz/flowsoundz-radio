import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type TipLink = {
  platform: string;
  label: string | null;
  url: string;
  isPrimary: boolean;
};

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")?.trim();
  if (!slug) return Response.json({ links: [] });

  const artist = await prisma.artist.findUnique({
    where: { slug },
    select: {
      name: true,
      supportLinks: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        select: { platform: true, label: true, url: true, isPrimary: true },
      },
    },
  });

  if (!artist) return Response.json({ links: [] });

  const links: TipLink[] = artist.supportLinks.map((l) => ({
    platform: l.platform,
    label: l.label,
    url: l.url,
    isPrimary: l.isPrimary,
  }));

  return Response.json({ name: artist.name, links });
}
