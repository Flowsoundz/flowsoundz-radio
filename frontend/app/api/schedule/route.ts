import { getCurrentShow, getUpcomingShows } from "@/lib/showSchedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    current: getCurrentShow(),
    upcoming: getUpcomingShows(5),
  });
}
