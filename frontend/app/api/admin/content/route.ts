import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { siteContent } from "@/lib/brand-content";

const CONTENT_FILE = path.join(process.cwd(), "content", "homepage.json");

export async function GET(): Promise<NextResponse> {
  try {
    const raw = await readFile(CONTENT_FILE, "utf8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json(siteContent);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const adminPassword = process.env.ADMIN_UPLOAD_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json(
      { error: "ADMIN_UPLOAD_PASSWORD is not configured" },
      { status: 500 },
    );
  }

  const body = (await req.json()) as { password?: string; content?: unknown };

  if (!body.password || body.password !== adminPassword) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  if (!body.content || typeof body.content !== "object") {
    return NextResponse.json({ error: "Missing content payload" }, { status: 422 });
  }

  await mkdir(path.dirname(CONTENT_FILE), { recursive: true });
  await writeFile(CONTENT_FILE, JSON.stringify(body.content, null, 2) + "\n", "utf8");

  return NextResponse.json({ ok: true });
}
