import { API_BASE } from "@/lib/api";

export type PromoTier = "basic" | "featured" | "sponsored";

type CreateCheckoutSessionResponse = {
  url: string;
};

export async function createPromoCheckoutSession(
  packageTier: PromoTier,
): Promise<string> {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://127.0.0.1:3000";

  const response = await fetch(`${API_BASE}/promo/create-checkout-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      package_tier: packageTier,
      origin,
    }),
  });

  const data = (await response.json().catch(() => null)) as
    | CreateCheckoutSessionResponse
    | { detail?: string }
    | null;

  if (!response.ok || !data || !("url" in data)) {
    throw new Error(
      data && "detail" in data && data.detail
        ? data.detail
        : "Unable to start checkout right now.",
    );
  }

  return data.url;
}
