import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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

export const WAITLIST_STORAGE_MODE = CAN_USE_FILE_FALLBACK
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
