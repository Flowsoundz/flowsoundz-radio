"use client";

import { useEffect, useState } from "react";
import type { Show } from "@/lib/showSchedule";

type ScheduleResponse = { current: Show | null; upcoming: { name: string; startsInMinutes: number; accentColor: string; emoji: string }[] };

export function NowOnAir() {
  const [current, setCurrent] = useState<Show | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    async function fetchSchedule() {
      try {
        const res = await fetch("/api/schedule");
        if (res.ok) {
          const data = (await res.json()) as ScheduleResponse;
          setCurrent(data.current);
        }
      } catch { /* ignore */ }
      setChecked(true);
    }
    void fetchSchedule();
    const id = setInterval(() => void fetchSchedule(), 5 * 60_000); // refresh every 5 min
    return () => clearInterval(id);
  }, []);

  if (!checked || !current) return null;

  return (
    <span
      className="state-fade inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold"
      style={{
        border: `1px solid ${current.accentColor}30`,
        background: `${current.accentColor}12`,
        color: current.accentColor,
      }}
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: current.accentColor }} />
      {current.emoji} {current.name}
    </span>
  );
}
