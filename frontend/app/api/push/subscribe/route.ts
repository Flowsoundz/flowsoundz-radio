import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type PushSubscriptionBody = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function POST(request: NextRequest) {
  let body: PushSubscriptionBody;
  try {
    body = (await request.json()) as PushSubscriptionBody;
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return Response.json({ error: "Missing subscription fields." }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId },
  });

  return Response.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  let body: { endpoint?: string };
  try {
    body = (await request.json()) as { endpoint?: string };
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  if (!body.endpoint) return Response.json({ error: "endpoint required." }, { status: 400 });

  await prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint } });
  return Response.json({ ok: true });
}
