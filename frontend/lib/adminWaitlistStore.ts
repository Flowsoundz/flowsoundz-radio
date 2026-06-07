import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

export type WaitlistEntryRecord = {
  id: string;
  email: string;
  joined_at: string;
  source: string;
};

const STORE_PATH = path.resolve(
  process.cwd(),
  "../backend/app/data/waitlist_entries.json",
);

const CAN_USE_FILE_FALLBACK =
  process.env.NODE_ENV !== "production" && !process.env.VERCEL;
const SHOULD_USE_PRISMA = Boolean(process.env.DATABASE_URL?.trim());

export const WAITLIST_STORAGE_MODE = SHOULD_USE_PRISMA
  ? "prisma"
  : CAN_USE_FILE_FALLBACK
    ? "file"
    : "unconfigured";

async function ensureStoreFile() {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    await writeFile(STORE_PATH, "[]\n", "utf8");
  }
}

export async function readWaitlistEntries(): Promise<WaitlistEntryRecord[]> {
  if (SHOULD_USE_PRISMA) {
    const records = await prisma.waitlistEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    return records.map((record) => ({
      id: record.id,
      email: record.email,
      joined_at: record.createdAt.toISOString(),
      source: record.source,
    }));
  }

  if (!CAN_USE_FILE_FALLBACK) {
    return [];
  }

  await ensureStoreFile();
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as WaitlistEntryRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function appendWaitlistEntry(entry: WaitlistEntryRecord) {
  if (SHOULD_USE_PRISMA) {
    await prisma.waitlistEntry.upsert({
      where: { email: entry.email },
      create: {
        id: entry.id,
        email: entry.email,
        source: entry.source,
        createdAt: new Date(entry.joined_at),
      },
      update: {
        source: entry.source,
      },
    });
    return;
  }

  if (!CAN_USE_FILE_FALLBACK) {
    return;
  }

  const current = await readWaitlistEntries();
  if (current.some((existing) => existing.email === entry.email)) {
    return;
  }

  await writeFile(
    STORE_PATH,
    JSON.stringify([entry, ...current], null, 2) + "\n",
    "utf8",
  );
}
