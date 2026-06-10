import type { NextRequest } from "next/server";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? "mailto:flowsoundzradio@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  process.env.VAPID_PRIVATE_KEY ?? "",
);

type SendBody = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
};

export async function POST(request: NextRequest) {
  const adminPassword = process.env.ADMIN_UPLOAD_PASSWORD;
  const authHeader = request.headers.get("authorization");
  if (!adminPassword || authHeader !== `Bearer ${adminPassword}`) {
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
    url: payload.url ?? "https://flowsoundzradio.com/radio",
    icon: payload.icon ?? "/brand/flowsoundz-fr-appicon-dark.png",
    badge: "/brand/flowsoundz-fr-icon-dark.png",
  });

  const staleEndpoints: string[] = [];

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
