import { NextResponse } from "next/server";

export const runtime = "nodejs";
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export async function POST(request: Request) {
  const formData = await request.formData();

  try {
    const response = await fetch(`${API_BASE}/admin/music`, {
      method: "POST",
      body: formData,
    });

    const data = (await response.json().catch(() => null)) as
      | { detail?: string; error?: string }
      | null;

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.detail ?? data?.error ?? "Failed to save song." },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to save song." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({}));

  try {
    const response = await fetch(`${API_BASE}/admin/music`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password: body.password ?? "",
        song_id: body.songId ?? "",
      }),
    });

    const data = (await response.json().catch(() => null)) as
      | { detail?: string; error?: string }
      | null;

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.detail ?? data?.error ?? "Failed to delete song." },
        { status: response.status },
      );
    }

    return NextResponse.json({ ok: true, songId: body.songId ?? "" });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete song." },
      { status: 500 },
    );
  }
}
