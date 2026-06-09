"use client";

import { useEffect, useState, useCallback } from "react";

const HEARTBEAT_MS = 5 * 60 * 1000; // 5 minutes

export function useVibePoints(isPlaying: boolean) {
  const [balance, setBalance] = useState<number | null>(null);

  // Fetch initial balance on mount
  useEffect(() => {
    fetch("/api/vibe/heartbeat")
      .then((r) => r.json())
      .then((d: { balance: number | null }) => {
        if (d.balance !== null) setBalance(d.balance);
      })
      .catch(() => undefined);
  }, []);

  // Send heartbeat every 5 min while playing — awards 10 points
  useEffect(() => {
    if (!isPlaying) return;

    const tick = () => {
      fetch("/api/vibe/heartbeat", { method: "POST" })
        .then((r) => r.json())
        .then((d: { balance?: number }) => {
          if (typeof d.balance === "number") setBalance(d.balance);
        })
        .catch(() => undefined);
    };

    const id = window.setInterval(tick, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [isPlaying]);

  const boost = useCallback(async (trackId: string): Promise<boolean> => {
    const res = await fetch("/api/vibe/boost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId }),
    });
    const data = (await res.json()) as { balance?: number; error?: string };
    if (res.ok && typeof data.balance === "number") {
      setBalance(data.balance);
      return true;
    }
    return false;
  }, []);

  return { balance, boost };
}
