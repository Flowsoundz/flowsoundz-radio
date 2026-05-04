import type { PromoTier } from "@/lib/stripe";

export const PROMO_PREVIEW_DRAFT_STORAGE_KEY =
  "flowsoundz-promo-preview-draft";

export const VIBE_TAG_OPTIONS = [
  "chill",
  "hype",
  "late_night",
  "emotional",
] as const;

export type VibeTag = (typeof VIBE_TAG_OPTIONS)[number];

export type AiOnboardProfile = {
  artist_bio: string;
  vibe_tag: VibeTag;
  promo_blurb: string;
};

export type PromoPreviewDraft = {
  amountPaid: number;
  packageTier: PromoTier;
  stripeSessionId: string;
  form: {
    artist_name: string;
    song_title: string;
    email: string;
    vibe: string;
    message: string;
  };
  aiProfile: AiOnboardProfile;
};
