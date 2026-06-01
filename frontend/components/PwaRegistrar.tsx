"use client";

import { useEffect } from "react";

export function PwaRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (typeof window !== "undefined") {
      const isLocalHost =
        window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

      if (process.env.NODE_ENV !== "production" && isLocalHost) {
        return;
      }
    }

    const registerServiceWorker = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch (error) {
        console.error("Service worker registration failed", error);
      }
    };

    void registerServiceWorker();
  }, []);

  return null;
}
