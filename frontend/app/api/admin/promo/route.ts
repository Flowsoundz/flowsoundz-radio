import { NextResponse } from "next/server";
import {
  readPromoPayments,
  updatePromoPaymentStatus,
  type PromoPaymentStatus,
} from "@/lib/promoPaymentStore";

export const runtime = "nodejs";

const VALID_STATUSES = new Set<PromoPaymentStatus>([
  "pending_review",
  "reviewed",
  "approved",
  "rejected",
]);

function authorized(password: string | null): boolean {
  const configured = process.env.ADMIN_UPLOAD_PASSWORD;
  return Boolean(configured && password === configured);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const password = searchParams.get("password");
  if (!authorized(password)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const payments = await readPromoPayments();
  return NextResponse.json({ payments });
}

export async function POST(request: Request) {
  let body: { password?: unknown; id?: unknown; status?: unknown; internalNotes?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!authorized(typeof body.password === "string" ? body.password : null)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  const rawStatus = typeof body.status === "string" ? body.status.trim() : "";
  const internalNotes =
    typeof body.internalNotes === "string" && body.internalNotes.trim()
      ? body.internalNotes.trim()
      : null;

  if (!id) return NextResponse.json({ error: "id required." }, { status: 422 });
  if (!VALID_STATUSES.has(rawStatus as PromoPaymentStatus)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 422 });
  }
  const status = rawStatus as PromoPaymentStatus;

  const updated = await updatePromoPaymentStatus({ id, status, internalNotes });
  if (!updated) {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, payment: updated });
}
