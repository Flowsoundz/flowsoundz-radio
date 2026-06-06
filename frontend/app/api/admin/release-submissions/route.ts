import { NextResponse } from "next/server";

export const runtime = "nodejs";

const UNAVAILABLE = {
  error:
    "Release submission inbox storage is not configured for this deployment yet.",
};

export async function GET() {
  return NextResponse.json({ submissions: [], storageMode: "unconfigured" });
}

export async function POST() {
  return NextResponse.json(UNAVAILABLE, { status: 503 });
}

export async function PATCH() {
  return NextResponse.json(UNAVAILABLE, { status: 503 });
}

export async function DELETE() {
  return NextResponse.json(UNAVAILABLE, { status: 503 });
}
