import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ArtistSubmissionStatus as PrismaArtistSubmissionStatus,
  SongVibe,
  type Prisma,
} from "@prisma/client";
import type { ArtistPromoOutput } from "@/lib/creatorHub/generators";
import { prisma } from "@/lib/prisma";

export type ArtistSubmissionStatus =
  | "new"
  | "reviewing"
  | "approved"
  | "rejected";

export type ArtistSubmissionRecord = {
  submission_id: string;
  created_at: string;
  updated_at: string;
  promo_updated_at: string | null;
  status: ArtistSubmissionStatus;
  internal_notes: string | null;
  artist_name: string;
  contact_name: string;
  email: string;
  song_title: string;
  genre: string;
  vibe: string;
  artist_type: string;
  description: string;
  song_link: string;
  version_type: string;
  producer_credit: string | null;
  streaming_link: string | null;
  cover_art_link: string | null;
  social_link: string | null;
  ai_used: boolean;
  ai_tool: string | null;
  rights_confirmed: boolean;
  samples_confirmed: boolean;
  promotion_permission_confirmed: boolean;
  removal_policy_confirmed: boolean;
  notes: string | null;
  promo: ArtistPromoOutput;
};

const STORE_PATH = path.resolve(
  process.cwd(),
  "../backend/app/data/artist_submissions.json",
);

const SHOULD_USE_PRISMA = Boolean(process.env.DATABASE_URL?.trim());
const CAN_USE_FILE_FALLBACK =
  process.env.NODE_ENV !== "production" && !process.env.VERCEL;

export const ARTIST_SUBMISSION_STORAGE_MODE = SHOULD_USE_PRISMA
  ? "prisma"
  : CAN_USE_FILE_FALLBACK
    ? "file"
    : "unconfigured";

function assertArtistSubmissionStoreConfigured() {
  if (SHOULD_USE_PRISMA || CAN_USE_FILE_FALLBACK) {
    return;
  }

  throw new Error(
    "Artist submission storage is not configured. Set DATABASE_URL for production deployments.",
  );
}

function toPrismaVibe(vibe: string): SongVibe {
  switch (vibe.trim().toLowerCase()) {
    case "hype":
      return SongVibe.HYPE;
    case "late night":
    case "late_night":
      return SongVibe.LATE_NIGHT;
    case "emotional":
      return SongVibe.EMOTIONAL;
    case "unsure":
      return SongVibe.UNSURE;
    case "chill":
    default:
      return SongVibe.CHILL;
  }
}

function fromPrismaVibe(vibe: SongVibe): string {
  switch (vibe) {
    case SongVibe.HYPE:
      return "Hype";
    case SongVibe.LATE_NIGHT:
      return "Late Night";
    case SongVibe.EMOTIONAL:
      return "Emotional";
    case SongVibe.UNSURE:
      return "Unsure";
    case SongVibe.CHILL:
    default:
      return "Chill";
  }
}

function toPrismaStatus(status: ArtistSubmissionStatus): PrismaArtistSubmissionStatus {
  switch (status) {
    case "reviewing":
      return PrismaArtistSubmissionStatus.REVIEWING;
    case "approved":
      return PrismaArtistSubmissionStatus.APPROVED;
    case "rejected":
      return PrismaArtistSubmissionStatus.REJECTED;
    case "new":
    default:
      return PrismaArtistSubmissionStatus.NEW;
  }
}

function fromPrismaStatus(
  status: PrismaArtistSubmissionStatus,
): ArtistSubmissionStatus {
  switch (status) {
    case PrismaArtistSubmissionStatus.REVIEWING:
      return "reviewing";
    case PrismaArtistSubmissionStatus.APPROVED:
      return "approved";
    case PrismaArtistSubmissionStatus.REJECTED:
      return "rejected";
    case PrismaArtistSubmissionStatus.NEW:
    default:
      return "new";
  }
}

function normalizeSocialCaptions(value: Prisma.JsonValue | null | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

type PrismaSubmissionPayload = Prisma.ArtistSubmissionGetPayload<{
  include: {
    promoAssets: true;
    reviews: {
      orderBy: { createdAt: "desc" };
    };
  };
}>;

function mapPrismaSubmission(
  submission: PrismaSubmissionPayload,
): ArtistSubmissionRecord {
  const latestReview = submission.reviews[0] ?? null;

  return {
    submission_id: submission.id,
    created_at: submission.createdAt.toISOString(),
    updated_at: submission.updatedAt.toISOString(),
    promo_updated_at: submission.promoAssets?.updatedAt.toISOString() ?? null,
    status: fromPrismaStatus(submission.status),
    internal_notes: latestReview?.internalNotes ?? null,
    artist_name: submission.artistName,
    contact_name: submission.contactName,
    email: submission.email,
    song_title: submission.songTitle,
    genre: submission.genre,
    vibe: fromPrismaVibe(submission.vibe),
    artist_type: submission.artistType,
    description: submission.description,
    song_link: submission.songLink,
    version_type: submission.versionType,
    producer_credit: submission.producerCredit,
    streaming_link: submission.streamingLink,
    cover_art_link: submission.coverArtLink,
    social_link: submission.socialLink,
    ai_used: submission.aiUsed,
    ai_tool: submission.aiTool,
    rights_confirmed: submission.rightsConfirmed,
    samples_confirmed: submission.samplesConfirmed,
    promotion_permission_confirmed: submission.promotionPermissionConfirmed,
    removal_policy_confirmed: submission.removalPolicyConfirmed,
    notes: submission.notes,
    promo: {
      bio: submission.promoAssets?.artistBio ?? "",
      suggestedVibe: submission.promoAssets
        ? fromPrismaVibe(submission.promoAssets.suggestedVibe)
        : "Chill",
      promoBlurb: submission.promoAssets?.promoBlurb ?? "",
      radioIntro: submission.promoAssets?.radioIntro ?? "",
      socialCaptions: normalizeSocialCaptions(submission.promoAssets?.socialCaptions),
    },
  };
}

async function ensureStoreFile() {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });

  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    await writeFile(STORE_PATH, "[]\n", "utf8");
  }
}

export async function readArtistSubmissions(): Promise<ArtistSubmissionRecord[]> {
  if (SHOULD_USE_PRISMA) {
    const submissions = await prisma.artistSubmission.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        promoAssets: true,
        reviews: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return submissions.map(mapPrismaSubmission);
  }

  // In production without DATABASE_URL, return empty — submissions arrive via email.
  if (!CAN_USE_FILE_FALLBACK) return [];

  await ensureStoreFile();

  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as ArtistSubmissionRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeArtistSubmissions(records: ArtistSubmissionRecord[]) {
  assertArtistSubmissionStoreConfigured();
  await ensureStoreFile();
  await writeFile(STORE_PATH, JSON.stringify(records, null, 2) + "\n", "utf8");
}

export async function createArtistSubmission(
  input: Omit<
    ArtistSubmissionRecord,
    | "submission_id"
    | "created_at"
    | "updated_at"
    | "promo_updated_at"
    | "status"
    | "internal_notes"
  >,
): Promise<ArtistSubmissionRecord> {
  if (SHOULD_USE_PRISMA) {
    const submission = await prisma.artistSubmission.create({
      data: {
        artistName: input.artist_name,
        contactName: input.contact_name,
        email: input.email,
        songTitle: input.song_title,
        genre: input.genre,
        vibe: toPrismaVibe(input.vibe),
        artistType: input.artist_type,
        description: input.description,
        songLink: input.song_link,
        versionType: input.version_type,
        producerCredit: input.producer_credit,
        streamingLink: input.streaming_link,
        coverArtLink: input.cover_art_link,
        socialLink: input.social_link,
        aiUsed: input.ai_used,
        aiTool: input.ai_tool,
        rightsConfirmed: input.rights_confirmed,
        samplesConfirmed: input.samples_confirmed,
        promotionPermissionConfirmed: input.promotion_permission_confirmed,
        removalPolicyConfirmed: input.removal_policy_confirmed,
        notes: input.notes,
        promoAssets: {
          create: {
            artistBio: input.promo.bio,
            suggestedVibe: toPrismaVibe(input.promo.suggestedVibe),
            promoBlurb: input.promo.promoBlurb,
            radioIntro: input.promo.radioIntro,
            socialCaptions: input.promo.socialCaptions,
          },
        },
      },
      include: {
        promoAssets: true,
        reviews: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return mapPrismaSubmission(submission);
  }

  assertArtistSubmissionStoreConfigured();

  const current = await readArtistSubmissions();
  const now = new Date().toISOString();
  const submission: ArtistSubmissionRecord = {
    submission_id: `artist_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    created_at: now,
    updated_at: now,
    promo_updated_at: now,
    status: "new",
    internal_notes: null,
    ...input,
  };

  await writeArtistSubmissions([submission, ...current]);
  return submission;
}

export async function updateArtistSubmissionReview(input: {
  submissionId: string;
  status: ArtistSubmissionStatus;
  internalNotes: string | null;
}) {
  if (SHOULD_USE_PRISMA) {
    const submission = await prisma.artistSubmission.update({
      where: { id: input.submissionId },
      data: {
        status: toPrismaStatus(input.status),
        reviews: {
          create: {
            status: toPrismaStatus(input.status),
            internalNotes: input.internalNotes,
            reviewedAt: new Date(),
          },
        },
      },
      include: {
        promoAssets: true,
        reviews: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return mapPrismaSubmission(submission);
  }

  assertArtistSubmissionStoreConfigured();

  const current = await readArtistSubmissions();
  let updated: ArtistSubmissionRecord | null = null;

  const next = current.map((submission) => {
    if (submission.submission_id !== input.submissionId) {
      return submission;
    }

    updated = {
      ...submission,
      status: input.status,
      internal_notes: input.internalNotes,
      updated_at: new Date().toISOString(),
    };
    return updated;
  });

  if (!updated) {
    throw new Error("Submission not found.");
  }

  await writeArtistSubmissions(next);
  return updated;
}

export async function readArtistSubmissionsByEmail(
  email: string,
): Promise<ArtistSubmissionRecord[]> {
  if (SHOULD_USE_PRISMA) {
    const submissions = await prisma.artistSubmission.findMany({
      where: { email },
      orderBy: { createdAt: "desc" },
      include: {
        promoAssets: true,
        reviews: { orderBy: { createdAt: "desc" } },
      },
    });
    return submissions.map(mapPrismaSubmission);
  }

  if (!CAN_USE_FILE_FALLBACK) return [];
  const all = await readArtistSubmissions();
  return all.filter((s) => s.email === email);
}

export async function updateArtistSubmissionPromo(input: {
  submissionId: string;
  promo: ArtistPromoOutput;
}) {
  if (SHOULD_USE_PRISMA) {
    const submission = await prisma.artistSubmission.update({
      where: { id: input.submissionId },
      data: {
        promoAssets: {
          upsert: {
            create: {
              artistBio: input.promo.bio,
              suggestedVibe: toPrismaVibe(input.promo.suggestedVibe),
              promoBlurb: input.promo.promoBlurb,
              radioIntro: input.promo.radioIntro,
              socialCaptions: input.promo.socialCaptions,
            },
            update: {
              artistBio: input.promo.bio,
              suggestedVibe: toPrismaVibe(input.promo.suggestedVibe),
              promoBlurb: input.promo.promoBlurb,
              radioIntro: input.promo.radioIntro,
              socialCaptions: input.promo.socialCaptions,
            },
          },
        },
      },
      include: {
        promoAssets: true,
        reviews: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return mapPrismaSubmission(submission);
  }

  assertArtistSubmissionStoreConfigured();

  const current = await readArtistSubmissions();
  let updated: ArtistSubmissionRecord | null = null;

  const next = current.map((submission) => {
    if (submission.submission_id !== input.submissionId) {
      return submission;
    }

    updated = {
      ...submission,
      updated_at: new Date().toISOString(),
      promo_updated_at: new Date().toISOString(),
      promo: input.promo,
    };

    return updated;
  });

  if (!updated) {
    throw new Error("Submission not found.");
  }

  await writeArtistSubmissions(next);
  return updated;
}
