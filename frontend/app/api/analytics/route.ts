import { NextResponse } from "next/server";
import {
  appendAnalyticsEvent,
  type AnalyticsEventName,
  type AnalyticsEventRecord,
} from "@/lib/analyticsEventStore";

export const runtime = "nodejs";

const VALID_EVENTS = new Set<AnalyticsEventName>([
  "page_view",
  "start_listening_click",
  "submission_click",
  "share_track_click",
  "waitlist_signup",
  "promo_submit_click",
  "track_skip",
  "track_complete",
  "visualizer_open",
  "artist_submission_started",
  "artist_submission_completed",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid analytics payload." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Invalid analytics payload." }, { status: 400 });
  }

  const event = typeof body.event === "string" ? body.event : "";
  const url = typeof body.url === "string" ? body.url : "/";
  const ts = typeof body.ts === "string" ? body.ts : new Date().toISOString();

  if (!VALID_EVENTS.has(event as AnalyticsEventName)) {
    return NextResponse.json({ error: "Invalid analytics event." }, { status: 422 });
  }

  const normalized: AnalyticsEventRecord = {
    event: event as AnalyticsEventName,
    url,
    ts,
  };

  for (const [key, value] of Object.entries(body)) {
    if (key in normalized) {
      continue;
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      normalized[key] = value;
    }
  }

  try {
    await appendAnalyticsEvent(normalized);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to store analytics event." },
      { status: 500 },
    );
  }
}
