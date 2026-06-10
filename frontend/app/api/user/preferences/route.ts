import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await req.json() as { allowExplicit?: boolean };
  if (typeof body.allowExplicit !== "boolean") {
    return NextResponse.json({ error: "allowExplicit must be a boolean." }, { status: 422 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { allowExplicit: body.allowExplicit },
  });

  return NextResponse.json({ ok: true, allowExplicit: body.allowExplicit });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ allowExplicit: true });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { allowExplicit: true },
  });

  return NextResponse.json({ allowExplicit: user?.allowExplicit ?? true });
}
