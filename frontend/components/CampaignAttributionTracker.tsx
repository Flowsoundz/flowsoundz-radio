"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { track } from "@/lib/analytics";

export function CampaignAttributionTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedRef = useRef("");

  useEffect(() => {
    const query = searchParams.toString();
    const pageKey = query ? `${pathname}?${query}` : pathname;

    if (!pageKey || lastTrackedRef.current === pageKey) return;

    lastTrackedRef.current = pageKey;
    track("page_view", {
      path: pathname,
      query: query || null,
    });
  }, [pathname, searchParams]);

  return null;
}
