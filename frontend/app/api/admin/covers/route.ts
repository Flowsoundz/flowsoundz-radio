import { NextResponse } from "next/server";

export const runtime = "nodejs";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export async function POST(request: Request) {
  const formData = await request.formData();

  try {
    const response = await fetch(`${API_BASE}/admin/covers`, {
      method: "POST",
      body: formData,
    });

    const data = (await response.json().catch(() => null)) as
      | { detail?: string; error?: string; coverUrl?: string }
      | null;

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.detail ?? data?.error ?? "Failed to save cover." },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to save cover." },
      { status: 500 },
    );
  }
}
