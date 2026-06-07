import { NextRequest, NextResponse } from "next/server";
import {
  WAITLIST_STORAGE_MODE,
  readWaitlistEntries,
} from "@/lib/adminWaitlistStore";
import { sendLaunchAnnouncement } from "@/lib/mailer";

export const runtime = "nodejs";

const ADMIN_PASSWORD = process.env.ADMIN_UPLOAD_PASSWORD ?? "";

function checkPassword(pw: string | null): boolean {
  return Boolean(ADMIN_PASSWORD && pw === ADMIN_PASSWORD);
}

export async function GET() {
  const entries = await readWaitlistEntries();
  return NextResponse.json({
    entries,
    storageMode: WAITLIST_STORAGE_MODE,
  });
}

// POST action=send_launch — blast launch email to all waitlist members
export async function POST(req: NextRequest) {
  let body: { action?: string; password?: string };
  try {
    body = (await req.json()) as { action?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!checkPassword(body.password ?? null)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (body.action !== "send_launch") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const entries = await readWaitlistEntries();
  if (entries.length === 0) {
    return NextResponse.json({ sent: 0, message: "No waitlist entries found." });
  }

  let sent = 0;
  let failed = 0;

  // Send in small batches to stay within Gmail's rate limits (500/day)
  for (const entry of entries) {
    try {
      await sendLaunchAnnouncement(entry.email);
      sent++;
      // 300ms between emails — ~200/min, well under Gmail limits
      await new Promise((r) => setTimeout(r, 300));
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    sent,
    failed,
    total: entries.length,
    message: `Launch email sent to ${sent} of ${entries.length} waitlist members.`,
  });
}
