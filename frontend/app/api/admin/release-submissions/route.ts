import { NextResponse } from "next/server";

export const runtime = "nodejs";

const UNAVAILABLE = {
  error: "This admin tool requires the FlowSoundz media backend to be running.",
  hint: "Start the local backend (cd backend && uvicorn app.main:app) to use this tool.",
};

export async function GET() {
  return NextResponse.json(UNAVAILABLE, { status: 503 });
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
