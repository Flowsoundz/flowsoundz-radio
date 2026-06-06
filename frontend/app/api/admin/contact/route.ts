import { NextResponse } from "next/server";
import {
  CONTACT_STORAGE_MODE,
  readContactMessages,
} from "@/lib/adminContactStore";

export const runtime = "nodejs";

export async function GET() {
  const messages = await readContactMessages();
  return NextResponse.json({
    messages,
    storageMode: CONTACT_STORAGE_MODE,
  });
}
