import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/siteUrl";
import { getWebPush } from "@/lib/webpush";

export const runtime = "nodejs";

type SendBody = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
};

export async function POST(request: NextRequest) {
  // Broadcasts a push to every subscriber — admin session only (was a shared
  // password in the Authorization header, which could leak in logs).
  const session = await auth();
  if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: SendBody;
  try {
    payload = (await request.json()) as SendBody;
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  const subscriptions = await prisma.pushSubscription.findMany();

  const notification = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? `${getSiteUrl()}/radio`,
    icon: payload.icon ?? "/brand/flowsoundz-fr-appicon-dark.png",
    badge: "/brand/flowsoundz-fr-icon-dark.png",
  });

  const staleEndpoints: string[] = [];

  const webpush = getWebPush();
  if (webpush) {
    await Promise.allSettled(
      subscriptions.map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            notification,
          );
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 410 || status === 404) {
            staleEndpoints.push(sub.endpoint);
          }
        }
      }),
    );
  }

  if (staleEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: staleEndpoints } },
    });
  }

  return Response.json({
    ok: true,
    sent: subscriptions.length - staleEndpoints.length,
    removed: staleEndpoints.length,
  });
}
