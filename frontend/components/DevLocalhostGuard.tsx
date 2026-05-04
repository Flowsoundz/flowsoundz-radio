"use client";

import { useEffect } from "react";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

export function DevLocalhostGuard() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
      return;
    }

    if (!LOCAL_HOSTS.has(window.location.hostname)) {
      return;
    }

    const cleanupDevRuntimeState = async () => {
      try {
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));
        }

        if ("caches" in window) {
          const cacheKeys = await caches.keys();
          await Promise.all(
            cacheKeys
              .filter((cacheKey) => cacheKey.startsWith("flowsoundz-"))
              .map((cacheKey) => caches.delete(cacheKey)),
          );
        }
      } catch (error) {
        console.warn("Failed to clear local dev runtime state", error);
      }
    };

    void cleanupDevRuntimeState();
  }, []);

  return null;
}
