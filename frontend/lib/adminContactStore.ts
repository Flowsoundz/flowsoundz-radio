import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type ContactMessageRecord = {
  id: string;
  topic: string;
  name: string;
  email: string;
  message: string;
  received_at: string;
  status: "unread" | "read";
};

const STORE_PATH = path.resolve(
  process.cwd(),
  "../backend/app/data/contact_messages.json",
);

const CAN_USE_FILE_FALLBACK =
  process.env.NODE_ENV !== "production" && !process.env.VERCEL;

export const CONTACT_STORAGE_MODE = CAN_USE_FILE_FALLBACK
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

export async function readContactMessages(): Promise<ContactMessageRecord[]> {
  if (!CAN_USE_FILE_FALLBACK) {
    return [];
  }

  await ensureStoreFile();
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as ContactMessageRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function appendContactMessage(entry: ContactMessageRecord) {
  if (!CAN_USE_FILE_FALLBACK) {
    return;
  }

  const current = await readContactMessages();
  await writeFile(
    STORE_PATH,
    JSON.stringify([entry, ...current], null, 2) + "\n",
    "utf8",
  );
}

export async function markContactMessageRead(id: string): Promise<boolean> {
  if (!CAN_USE_FILE_FALLBACK) {
    return false;
  }

  const current = await readContactMessages();
  let updated = false;
  const next = current.map((entry) => {
    if (entry.id !== id) {
      return entry;
    }

    updated = true;
    return {
      ...entry,
      status: "read" as const,
    };
  });

  if (!updated) {
    return false;
  }

  await writeFile(STORE_PATH, JSON.stringify(next, null, 2) + "\n", "utf8");
  return true;
}
