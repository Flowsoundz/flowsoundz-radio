import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  AnalyticsEventName as PrismaAnalyticsEventName,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AnalyticsEventName =
  | "page_view"
  | "start_listening_click"
  | "submission_click"
  | "share_track_click"
  | "waitlist_signup"
  | "promo_submit_click"
  | "track_skip"
  | "track_complete"
  | "visualizer_open"
  | "artist_submission_started"
  | "artist_submission_completed";

export type AnalyticsEventRecord = {
  event: AnalyticsEventName;
  url: string;
  ts: string;
  trackId?: string | null;
  title?: string | null;
  artist?: string | null;
  vibe?: string | null;
  action?: string | null;
  source?: string | null;
  label?: string | null;
  [key: string]: string | number | boolean | null | undefined;
};

const STORE_PATH = path.resolve(
  process.cwd(),
  "../backend/app/data/analytics_events.json",
);

const SHOULD_USE_PRISMA = Boolean(process.env.DATABASE_URL?.trim());
const CAN_USE_FILE_FALLBACK =
  process.env.NODE_ENV !== "production" && !process.env.VERCEL;

export const ANALYTICS_STORAGE_MODE = SHOULD_USE_PRISMA
  ? "prisma"
  : CAN_USE_FILE_FALLBACK
    ? "file"
    : "unconfigured";

function assertAnalyticsStoreConfigured() {
  if (SHOULD_USE_PRISMA || CAN_USE_FILE_FALLBACK) {
    return;
  }

  throw new Error(
    "Analytics storage is not configured. Set DATABASE_URL for production deployments.",
  );
}

function toPrismaEventName(event: AnalyticsEventName): PrismaAnalyticsEventName {
  switch (event) {
    case "page_view":
      return PrismaAnalyticsEventName.PAGE_VIEW;
    case "submission_click":
      return PrismaAnalyticsEventName.SUBMISSION_CLICK;
    case "share_track_click":
      return PrismaAnalyticsEventName.SHARE_TRACK_CLICK;
    case "waitlist_signup":
      return PrismaAnalyticsEventName.WAITLIST_SIGNUP;
    case "promo_submit_click":
      return PrismaAnalyticsEventName.PROMO_SUBMIT_CLICK;
    case "track_skip":
      return PrismaAnalyticsEventName.TRACK_SKIP;
    case "track_complete":
      return PrismaAnalyticsEventName.TRACK_COMPLETE;
    case "visualizer_open":
      return PrismaAnalyticsEventName.VISUALIZER_OPEN;
    case "artist_submission_started":
      return PrismaAnalyticsEventName.ARTIST_SUBMISSION_STARTED;
    case "artist_submission_completed":
      return PrismaAnalyticsEventName.ARTIST_SUBMISSION_COMPLETED;
    case "start_listening_click":
    default:
      return PrismaAnalyticsEventName.START_LISTENING_CLICK;
  }
}

function fromPrismaEventName(event: PrismaAnalyticsEventName): AnalyticsEventName {
  switch (event) {
    case PrismaAnalyticsEventName.PAGE_VIEW:
      return "page_view";
    case PrismaAnalyticsEventName.SUBMISSION_CLICK:
      return "submission_click";
    case PrismaAnalyticsEventName.SHARE_TRACK_CLICK:
      return "share_track_click";
    case PrismaAnalyticsEventName.WAITLIST_SIGNUP:
      return "waitlist_signup";
    case PrismaAnalyticsEventName.PROMO_SUBMIT_CLICK:
      return "promo_submit_click";
    case PrismaAnalyticsEventName.TRACK_SKIP:
      return "track_skip";
    case PrismaAnalyticsEventName.TRACK_COMPLETE:
      return "track_complete";
    case PrismaAnalyticsEventName.VISUALIZER_OPEN:
      return "visualizer_open";
    case PrismaAnalyticsEventName.ARTIST_SUBMISSION_STARTED:
      return "artist_submission_started";
    case PrismaAnalyticsEventName.ARTIST_SUBMISSION_COMPLETED:
      return "artist_submission_completed";
    case PrismaAnalyticsEventName.START_LISTENING_CLICK:
    default:
      return "start_listening_click";
  }
}

function mapPrismaAnalyticsRecord(
  record: Prisma.AnalyticsEventGetPayload<Record<string, never>>,
): AnalyticsEventRecord {
  const properties =
    record.properties && typeof record.properties === "object" && !Array.isArray(record.properties)
      ? (record.properties as Record<string, unknown>)
      : {};

  const normalized: AnalyticsEventRecord = {
    event: fromPrismaEventName(record.eventName),
    url: record.url,
    ts: record.createdAt.toISOString(),
  };

  for (const [key, value] of Object.entries(properties)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      normalized[key] = value;
    }
  }

  return normalized;
}

async function ensureStoreFile() {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });

  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    await writeFile(STORE_PATH, "[]\n", "utf8");
  }
}

export async function readAnalyticsEvents(): Promise<AnalyticsEventRecord[]> {
  if (SHOULD_USE_PRISMA) {
    const records = await prisma.analyticsEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    return records.map(mapPrismaAnalyticsRecord);
  }

  assertAnalyticsStoreConfigured();
  await ensureStoreFile();

  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as AnalyticsEventRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAnalyticsEvents(records: AnalyticsEventRecord[]) {
  assertAnalyticsStoreConfigured();
  await ensureStoreFile();
  await writeFile(STORE_PATH, JSON.stringify(records, null, 2) + "\n", "utf8");
}

export async function appendAnalyticsEvent(event: AnalyticsEventRecord) {
  if (SHOULD_USE_PRISMA) {
    const { event: eventName, url, ts, ...rest } = event;

    await prisma.analyticsEvent.create({
      data: {
        eventName: toPrismaEventName(eventName),
        url,
        createdAt: ts ? new Date(ts) : new Date(),
        properties: rest,
      },
    });
    return;
  }

  assertAnalyticsStoreConfigured();
  const current = await readAnalyticsEvents();
  const next = [event, ...current].slice(0, 5000);
  await writeAnalyticsEvents(next);
}

function topCounts(records: AnalyticsEventRecord[], key: "title" | "vibe" | "event") {
  const counts = new Map<string, number>();

  for (const record of records) {
    const value = record[key];
    if (typeof value !== "string" || !value.trim()) {
      continue;
    }
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, count]) => ({ label, count }));
}

export function summarizeAnalyticsEvents(records: AnalyticsEventRecord[]) {
  const plays = records.filter(
    (record) =>
      record.event === "start_listening_click" && record.action === "play",
  ).length;
  const pauses = records.filter(
    (record) =>
      record.event === "start_listening_click" && record.action === "pause",
  ).length;
  const skips = records.filter((record) => record.event === "track_skip").length;
  const completes = records.filter(
    (record) => record.event === "track_complete",
  ).length;
  const visualizerOpens = records.filter(
    (record) => record.event === "visualizer_open",
  ).length;
  const submissionStarts = records.filter(
    (record) => record.event === "artist_submission_started",
  ).length;
  const submissionCompletes = records.filter(
    (record) => record.event === "artist_submission_completed",
  ).length;

  return {
    totals: {
      events: records.length,
      plays,
      pauses,
      skips,
      completes,
      visualizerOpens,
      submissionStarts,
      submissionCompletes,
      submitConversion:
        submissionStarts > 0
          ? Math.round((submissionCompletes / submissionStarts) * 100)
          : 0,
    },
    topTracks: topCounts(
      records.filter((record) =>
        record.event === "track_complete" || record.event === "track_skip",
      ),
      "title",
    ),
    topVibes: topCounts(records, "vibe"),
    topEvents: topCounts(records, "event"),
    recent: records.slice(0, 20),
  };
}
