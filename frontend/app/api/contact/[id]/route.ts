import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { markContactMessageRead } from "@/lib/adminContactStore";

export const runtime = "nodejs";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const updated = await markContactMessageRead(id);
  if (!updated) {
    return NextResponse.json(
      { error: "Unable to update message." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
