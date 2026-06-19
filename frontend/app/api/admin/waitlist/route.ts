import { NextRequest, NextResponse } from "next/server";
import {
  WAITLIST_STORAGE_MODE,
  readWaitlistEntries,
} from "@/lib/adminWaitlistStore";
import { sendLaunchAnnouncement } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/siteUrl";

export const runtime = "nodejs";

const ADMIN_PASSWORD = process.env.ADMIN_UPLOAD_PASSWORD ?? "";

function checkPassword(pw: string | null): boolean {
  return Boolean(ADMIN_PASSWORD && pw === ADMIN_PASSWORD);
}

// Replicates Auth.js v5's token hashing: SHA-256(rawToken + AUTH_SECRET)
async function hashToken(rawToken: string): Promise<string> {
  const secret = process.env.AUTH_SECRET ?? "";
  const data = new TextEncoder().encode(`${rawToken}${secret}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Generates a random string the same way Auth.js does (randomString(32))
function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytes.reduce((acc, b) => acc + b.toString(36).padStart(2, "0"), "");
}

async function generateMagicLink(email: string): Promise<string> {
  const siteUrl = getSiteUrl().replace(/\/$/, "");
  const rawToken = randomToken();
  const hashedToken = await hashToken(rawToken);
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Remove any existing token for this email before creating a new one
  await prisma.verificationToken.deleteMany({
    where: { identifier: email },
  }).catch(() => undefined);

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: hashedToken,
      expires,
    },
  });

  const params = new URLSearchParams({
    callbackUrl: `${siteUrl}/radio`,
    token: rawToken,
    email,
  });
  return `${siteUrl}/api/auth/callback/nodemailer?${params.toString()}`;
}

export async function GET() {
  const entries = await readWaitlistEntries();
  return NextResponse.json({
    entries,
    storageMode: WAITLIST_STORAGE_MODE,
  });
}

// POST action=send_launch — blast launch email + magic sign-in link to every waitlist member
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

  for (const entry of entries) {
    try {
      // Generate a unique magic sign-in link for this email
      const magicLink = await generateMagicLink(entry.email);
      await sendLaunchAnnouncement(entry.email, magicLink);
      sent++;
      // 400ms between sends — stays well under Gmail's 500/day and rate limits
      await new Promise((r) => setTimeout(r, 400));
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
