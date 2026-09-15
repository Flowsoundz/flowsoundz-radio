import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthorizedCronRequest } from "@/lib/cronAuth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  await prisma.song.findFirst({ select: { id: true } });

  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
