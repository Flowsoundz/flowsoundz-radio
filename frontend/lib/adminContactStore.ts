import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ContactTopic, InboxStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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
const SHOULD_USE_PRISMA = Boolean(process.env.DATABASE_URL?.trim());

export const CONTACT_STORAGE_MODE = SHOULD_USE_PRISMA
  ? "prisma"
  : CAN_USE_FILE_FALLBACK
    ? "file"
    : "unconfigured";

function toPrismaTopic(topic: string): ContactTopic {
  switch (topic.trim().toLowerCase()) {
    case "artist":
      return ContactTopic.ARTIST;
    case "partnership":
      return ContactTopic.PARTNERSHIP;
    case "general":
    default:
      return ContactTopic.GENERAL;
  }
}

function fromPrismaTopic(topic: ContactTopic): ContactMessageRecord["topic"] {
  switch (topic) {
    case ContactTopic.ARTIST:
      return "artist";
    case ContactTopic.PARTNERSHIP:
      return "partnership";
    case ContactTopic.GENERAL:
    default:
      return "general";
  }
}

function fromPrismaStatus(status: InboxStatus): ContactMessageRecord["status"] {
  return status === InboxStatus.READ ? "read" : "unread";
}

async function ensureStoreFile() {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    await writeFile(STORE_PATH, "[]\n", "utf8");
  }
}

export async function readContactMessages(): Promise<ContactMessageRecord[]> {
  if (SHOULD_USE_PRISMA) {
    const records = await prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    return records.map((record) => ({
      id: record.id,
      topic: fromPrismaTopic(record.topic),
      name: record.name,
      email: record.email,
      message: record.message,
      received_at: record.createdAt.toISOString(),
      status: fromPrismaStatus(record.status),
    }));
  }

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
  if (SHOULD_USE_PRISMA) {
    await prisma.contactMessage.create({
      data: {
        id: entry.id,
        topic: toPrismaTopic(entry.topic),
        name: entry.name,
        email: entry.email,
        message: entry.message,
        status: entry.status === "read" ? InboxStatus.READ : InboxStatus.UNREAD,
        createdAt: new Date(entry.received_at),
      },
    });
    return;
  }

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
  if (SHOULD_USE_PRISMA) {
    const updated = await prisma.contactMessage.updateMany({
      where: { id },
      data: { status: InboxStatus.READ },
    });
    return updated.count > 0;
  }

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
