import { NextResponse } from "next/server";

export const runtime = "nodejs";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export async function GET() {
  try {
    const response = await fetch(`${API_BASE}/admin/release-submissions`, {
      cache: "no-store",
    });
    const data = (await response.json().catch(() => null)) as
      | { detail?: string; submissions?: unknown[] }
      | null;

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.detail ?? "Failed to load submissions." },
        { status: response.status },
      );
    }

    return NextResponse.json({ submissions: data?.submissions ?? [] });
  } catch {
    return NextResponse.json(
      { error: "Failed to load submissions." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const action = String(formData.get("action") ?? "review").trim();
  const password = String(formData.get("password") ?? "");
  const submissionId = String(formData.get("submissionId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const rawNotes = String(formData.get("internalNotes") ?? "").trim();
  const internalNotes = rawNotes || null;

  try {
    const response = await fetch(`${API_BASE}/admin/release-submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        password,
        submission_id: submissionId,
        status,
        internal_notes: internalNotes,
      }),
    });

    const data = (await response.json().catch(() => null)) as
      | { detail?: string; submission?: unknown }
      | null;

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.detail ?? "Failed to save." },
        { status: response.status },
      );
    }

    return NextResponse.json({ ok: true, submissionId, submission: data?.submission });
  } catch {
    return NextResponse.json({ error: "Failed to save." }, { status: 500 });
  }
}
