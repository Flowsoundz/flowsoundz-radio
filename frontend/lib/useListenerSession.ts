"use client";

import { useEffect, useState } from "react";

const HEARTBEAT_MS = 60_000; // every 60s
const COUNT_POLL_MS = 30_000; // every 30s

function getOrCreateSessionId(): string {
  const key = "fsr-session-id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function useListenerSession(currentSongId?: string | null) {
  const [listenerCount, setListenerCount] = useState<number | null>(null);

  useEffect(() => {
    const sessionId = getOrCreateSessionId();

    async function heartbeat() {
      try {
        await fetch("/api/radio/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, songId: currentSongId ?? null }),
        });
      } catch {
        // fire-and-forget
      }
    }

    async function fetchCount() {
      try {
        const res = await fetch("/api/radio/session");
        if (res.ok) {
          const data = (await res.json()) as { count: number };
          setListenerCount(data.count);
        }
      } catch {
        // ignore
      }
    }

    heartbeat();
    fetchCount();

    const hbTimer = setInterval(heartbeat, HEARTBEAT_MS);
    const countTimer = setInterval(fetchCount, COUNT_POLL_MS);

    return () => {
      clearInterval(hbTimer);
      clearInterval(countTimer);
    };
  }, [currentSongId]);

  return listenerCount;
}
