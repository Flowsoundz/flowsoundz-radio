import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type PromoPaymentTier = "basic" | "featured" | "sponsored";
export type PromoPaymentStatus = "pending_review" | "reviewed" | "approved" | "rejected";

export type PromoPaymentRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  tier: PromoPaymentTier;
  artistName: string;
  songTitle: string;
  email: string;
  amountCents: number;
  stripeSessionId: string;
  status: PromoPaymentStatus;
  internalNotes: string | null;
};

const STORE_PATH = path.resolve(
  process.cwd(),
  "../backend/app/data/promo_payments.json",
);

const CAN_USE_FILE =
  process.env.NODE_ENV !== "production" && !process.env.VERCEL;

async function ensureFile() {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    await writeFile(STORE_PATH, "[]\n", "utf8");
  }
}

export async function readPromoPayments(): Promise<PromoPaymentRecord[]> {
  if (!CAN_USE_FILE) return [];
  await ensureFile();
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as PromoPaymentRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function appendPromoPayment(
  record: PromoPaymentRecord,
): Promise<void> {
  if (!CAN_USE_FILE) return;
  await ensureFile();
  const current = await readPromoPayments();
  if (current.some((r) => r.stripeSessionId === record.stripeSessionId)) return;
  await writeFile(
    STORE_PATH,
    JSON.stringify([record, ...current], null, 2) + "\n",
    "utf8",
  );
}

export async function updatePromoPaymentStatus(input: {
  id: string;
  status: PromoPaymentStatus;
  internalNotes: string | null;
}): Promise<PromoPaymentRecord | null> {
  if (!CAN_USE_FILE) return null;
  const current = await readPromoPayments();
  let updated: PromoPaymentRecord | null = null;
  const next = current.map((r) => {
    if (r.id !== input.id) return r;
    updated = {
      ...r,
      status: input.status,
      internalNotes: input.internalNotes,
      updatedAt: new Date().toISOString(),
    };
    return updated;
  });
  if (!updated) return null;
  await writeFile(
    STORE_PATH,
    JSON.stringify(next, null, 2) + "\n",
    "utf8",
  );
  return updated;
}
