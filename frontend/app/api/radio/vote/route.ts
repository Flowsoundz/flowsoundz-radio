import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET: fetch current vote counts for a song
export async function GET(req: NextRequest) {
  const songId = req.nextUrl.searchParams.get("songId");
  if (!songId) return NextResponse.json({ error: "Missing songId" }, { status: 400 });

  try {
    const pref = await prisma.queuePreference.findUnique({ where: { songId } });
    return NextResponse.json({
      hypeCount: pref?.hypeCount ?? 0,
      playCount: pref?.playCount ?? 0,
      rotationScore: pref?.rotationScore ?? 0,
    });
  } catch {
    return NextResponse.json({ hypeCount: 0, playCount: 0, rotationScore: 0 });
  }
}

// POST: record a hype or skip vote
export async function POST(req: NextRequest) {
  const body = await req.json() as { songId?: string; vote?: string };
  const { songId, vote } = body;

  if (!songId || (vote !== "hype" && vote !== "skip")) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const existing = await prisma.queuePreference.findUnique({ where: { songId } });

    const playCount = existing?.playCount ?? 1;
    const currentHype = existing?.hypeCount ?? 0;
    const currentSkipRate = existing?.skipRate ?? 0;

    const newHypeCount = vote === "hype" ? currentHype + 1 : currentHype;
    const newSkipRate = vote === "skip"
      ? Math.min(1, currentSkipRate + 1 / Math.max(playCount, 1))
      : currentSkipRate;

    // rotationScore: 0-100, driven by hype density minus skip penalty
    const hypeDensity = newHypeCount / Math.max(playCount, 1);
    const newRotationScore = Math.max(0, Math.min(100,
      50 + (hypeDensity * 60) - (newSkipRate * 40)
    ));

    const pref = await prisma.queuePreference.upsert({
      where: { songId },
      create: {
        songId,
        hypeCount: newHypeCount,
        skipRate: newSkipRate,
        rotationScore: newRotationScore,
        playCount: existing?.playCount ?? 1,
      },
      update: {
        hypeCount: newHypeCount,
        skipRate: newSkipRate,
        rotationScore: newRotationScore,
      },
    });

    return NextResponse.json({
      hypeCount: pref.hypeCount,
      rotationScore: pref.rotationScore,
    });
  } catch (err) {
    console.error("[vote]", err);
    return NextResponse.json({ error: "Failed to record vote" }, { status: 500 });
  }
}
