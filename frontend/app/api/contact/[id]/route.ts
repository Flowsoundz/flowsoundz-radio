import { NextResponse } from "next/server";

export const runtime = "nodejs";
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const response = await fetch(`${API_BASE}/admin/contact/${encodeURIComponent(id)}`, {
    method: "PATCH",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    detail?: string;
    error?: string;
    ok?: boolean;
  };

  if (!response.ok) {
    return NextResponse.json(
      { error: payload.detail || payload.error || "Unable to update message." },
      { status: response.status },
    );
  }

  return NextResponse.json({ ok: payload.ok ?? true });
}
