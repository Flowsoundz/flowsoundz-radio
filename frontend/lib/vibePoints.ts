import { prisma } from "@/lib/prisma";

const AWARD = { LISTEN_5MIN: 10, VOTE: 5, SHARE: 25, QUEUE_BOOST: 0 } as const;
const BOOST_COST = 50;

export async function getVibeBalance(userId: string): Promise<number> {
  const row = await prisma.vibePoints.findUnique({ where: { userId } });
  return row?.balance ?? 0;
}

export async function awardVibePoints(
  userId: string,
  reason: "LISTEN_5MIN" | "VOTE" | "SHARE",
): Promise<number> {
  const delta = AWARD[reason];
  const row = await prisma.vibePoints.upsert({
    where: { userId },
    create: { userId, balance: delta },
    update: { balance: { increment: delta } },
  });
  await prisma.vibeTransaction.create({ data: { userId, delta, reason } });
  return row.balance;
}

export async function spendVibePoints(
  userId: string,
  trackId: string,
): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  const row = await prisma.vibePoints.findUnique({ where: { userId } });
  if (!row || row.balance < BOOST_COST) {
    return { ok: false, error: `Need ${BOOST_COST} Vibe Points to boost a track.` };
  }

  const [updated] = await prisma.$transaction([
    prisma.vibePoints.update({
      where: { userId },
      data: { balance: { decrement: BOOST_COST } },
    }),
    prisma.vibeTransaction.create({
      data: { userId, delta: -BOOST_COST, reason: "QUEUE_BOOST" },
    }),
    prisma.queueBoost.upsert({
      where: { trackId },
      create: { trackId, score: 1 },
      update: { score: { increment: 1 } },
    }),
  ]);

  return { ok: true, balance: updated.balance };
}
