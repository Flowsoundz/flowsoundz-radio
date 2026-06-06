import { NextResponse } from "next/server";
import {
  WAITLIST_STORAGE_MODE,
  readWaitlistEntries,
} from "@/lib/adminWaitlistStore";

export const runtime = "nodejs";

export async function GET() {
  const entries = await readWaitlistEntries();
  return NextResponse.json({
    entries,
    storageMode: WAITLIST_STORAGE_MODE,
  });
}
