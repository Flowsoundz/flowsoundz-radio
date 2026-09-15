"use client";

const STORAGE_KEY = "fsr_attribution";
const KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;

export type Attribution = Partial<Record<(typeof KEYS)[number], string>>;

function clean(value: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 120) : undefined;
}

export function getAttribution(): Attribution {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(window.location.search);
  const fromUrl: Attribution = {};

  for (const key of KEYS) {
    const value = clean(params.get(key));
    if (value) fromUrl[key] = value;
  }

  if (Object.keys(fromUrl).length > 0) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fromUrl));
    } catch {
      // Private browsing or storage limits should not block a conversion.
    }
    return fromUrl;
  }

  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}");
    if (stored && typeof stored === "object" && !Array.isArray(stored)) {
      return stored as Attribution;
    }
  } catch {
    // Ignore malformed or unavailable session storage.
  }

  return {};
}

export function getAttributionSource(): string {
  const attribution = getAttribution();
  return attribution.utm_source ?? attribution.utm_medium ?? "direct";
}
