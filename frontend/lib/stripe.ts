export type PromoTier = "basic" | "featured" | "sponsored";

type CreateCheckoutSessionResponse = {
  url: string;
};

export async function createPromoCheckoutSession(
  packageTier: PromoTier,
  metadata?: { artistName?: string; songTitle?: string },
): Promise<string> {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://flowsoundzradio.vercel.app";

  const response = await fetch("/api/promo/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      package_tier: packageTier,
      artist_name: metadata?.artistName ?? "",
      song_title: metadata?.songTitle ?? "",
      origin,
    }),
  });

  const data = (await response.json().catch(() => null)) as
    | CreateCheckoutSessionResponse
    | { error?: string }
    | null;

  if (!response.ok || !data || !("url" in data) || !data.url) {
    throw new Error(
      data && "error" in data && data.error
        ? data.error
        : "Unable to start checkout right now.",
    );
  }

  return data.url;
}
