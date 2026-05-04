import { NextResponse } from "next/server";

export const runtime = "nodejs";
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export async function POST(request: Request) {
  const formData = await request.formData();
  try {
    const response = await fetch(`${API_BASE}/admin/releases`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password: String(formData.get("password") ?? ""),
        song_id: String(formData.get("songId") ?? ""),
        access_tier: String(formData.get("accessTier") ?? "").trim(),
        member_release_at:
          String(formData.get("memberReleaseAt") ?? "").trim() || null,
        public_release_at:
          String(formData.get("publicReleaseAt") ?? "").trim() || null,
        is_featured: String(formData.get("isFeatured") ?? "") === "true",
        is_vault: String(formData.get("isVault") ?? "") === "true",
        behind_the_mix_text:
          String(formData.get("behindTheMixText") ?? "").trim() || null,
      }),
    });

    const data = (await response.json().catch(() => null)) as
      | { detail?: string; error?: string }
      | null;

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.detail ?? data?.error ?? "Failed to save release settings.",
        },
        { status: response.status },
      );
    }

    return NextResponse.json({ ok: true, songId: formData.get("songId") });
  } catch {
    return NextResponse.json(
      { error: "Failed to save release settings." },
      { status: 500 },
    );
  }
}
