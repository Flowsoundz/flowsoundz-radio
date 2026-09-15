export function isAuthorizedCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("[cron] CRON_SECRET is not configured");
    return false;
  }

  return req.headers.get("authorization") === `Bearer ${secret}`;
}
