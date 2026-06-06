import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readAdminCatalogSongs } from "@/lib/adminCatalog";

export const runtime = "nodejs";

const RELEASES_UNAVAILABLE = {
  error:
    "Release settings editing requires DATABASE_URL so metadata can be written to the production catalog.",
};

export async function GET() {
  const songs = await readAdminCatalogSongs();
  return NextResponse.json({ songs });
}

async function saveReleaseSettings(request: Request) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const songId = String(formData.get("songId") ?? "").trim();
  const accessTierRaw = String(formData.get("accessTier") ?? "").trim();
  const memberReleaseAtRaw = String(formData.get("memberReleaseAt") ?? "").trim();
  const publicReleaseAtRaw = String(formData.get("publicReleaseAt") ?? "").trim();
  const isFeatured = String(formData.get("isFeatured") ?? "") === "true";
  const isVault = String(formData.get("isVault") ?? "") === "true";
  const behindTheMixTextRaw = String(formData.get("behindTheMixText") ?? "");

  if (!process.env.ADMIN_UPLOAD_PASSWORD) {
    return NextResponse.json(
      { error: "ADMIN_UPLOAD_PASSWORD is not configured." },
      { status: 500 },
    );
  }

  if (password !== process.env.ADMIN_UPLOAD_PASSWORD) {
    return NextResponse.json({ error: "Invalid admin password." }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(RELEASES_UNAVAILABLE, { status: 503 });
  }

  if (!songId) {
    return NextResponse.json({ error: "Song ID is required." }, { status: 422 });
  }

  const accessTier = accessTierRaw || null;
  const memberReleaseAt = memberReleaseAtRaw ? new Date(memberReleaseAtRaw) : null;
  const publicReleaseAt = publicReleaseAtRaw ? new Date(publicReleaseAtRaw) : null;
  const behindTheMixText = behindTheMixTextRaw.trim() || null;

  try {
    const song = await prisma.song.update({
      where: { id: songId },
      data: {
        accessTier,
        memberReleaseAt,
        publicReleaseAt,
        isFeatured,
        isVault,
        behindTheMixText,
      },
    });

    return NextResponse.json({ ok: true, song });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save release settings.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return saveReleaseSettings(request);
}

export async function PATCH(request: Request) {
  return saveReleaseSettings(request);
}

export async function DELETE() {
  return NextResponse.json(RELEASES_UNAVAILABLE, { status: 503 });
}
