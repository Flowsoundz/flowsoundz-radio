import { prisma } from "@/lib/prisma";
import { slugifyArtistName } from "@/lib/catalogSnapshot";
import { evaluateSubmissionRequirements, type RequirementVerdict } from "@/lib/submissionRequirements";
import { resolveDirectAudioUrl } from "@/lib/resolveAudioSource";

const VIBES = new Set(["CHILL", "HYPE", "LATE_NIGHT", "EMOTIONAL", "UNSURE"]);

function songSlug(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "") // combining diacritics
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "track"
  );
}

export type PublishResult =
  | { ok: true; songId: string; alreadyPublished: boolean; verdict: RequirementVerdict }
  | { ok: false; reason: "blocked"; verdict: RequirementVerdict }
  | { ok: false; reason: "not_found" };

/**
 * Turn an approved artist submission into a PENDING catalog Song that the
 * mastering worker will normalize and publish. Idempotent (publishedSongId
 * guard) and gated by the requirements engine — a submission missing rights
 * confirmation can't be published even by an admin clicking approve.
 *
 * `overrideAudioUrl` lets the admin paste the direct CDN file when the
 * submitted link was a share page (the `resolvableAudio` warning).
 */
export async function publishApprovedSubmission(
  submissionId: string,
  overrideAudioUrl?: string,
): Promise<PublishResult> {
  const sub = await prisma.artistSubmission.findUnique({ where: { id: submissionId } });
  if (!sub) return { ok: false, reason: "not_found" };

  // Idempotency — already published, don't re-create the job.
  if (sub.publishedSongId) {
    const verdict = evaluateSubmissionRequirements(sub);
    return { ok: true, songId: sub.publishedSongId, alreadyPublished: true, verdict };
  }

  const verdict = evaluateSubmissionRequirements(sub);
  if (!verdict.passed) return { ok: false, reason: "blocked", verdict };

  const rawSource = (overrideAudioUrl ?? sub.songLink ?? "").trim();
  // Share links resolve to the underlying CDN file so artists can paste
  // whatever the platform gave them.
  const resolved = await resolveDirectAudioUrl(rawSource);
  const sourceAudioUrl = resolved?.url ?? rawSource;

  const artistSlug = slugifyArtistName(sub.artistName);
  const artist = await prisma.artist.upsert({
    where: { slug: artistSlug },
    create: { name: sub.artistName, slug: artistSlug },
    update: {},
  });

  const base = songSlug(sub.songTitle);
  let slug = base;
  if (await prisma.song.findUnique({ where: { slug } })) {
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const vibe = VIBES.has((sub.vibe ?? "").toUpperCase())
    ? ((sub.vibe ?? "").toUpperCase() as "CHILL" | "HYPE" | "LATE_NIGHT" | "EMOTIONAL" | "UNSURE")
    : "HYPE";

  const song = await prisma.song.create({
    data: {
      artistId: artist.id,
      title: sub.songTitle,
      slug,
      genre: sub.genre || "Independent",
      vibe,
      audioUrl: sourceAudioUrl,
      sourceAudioUrl,
      packagingStatus: "PENDING",
    },
    select: { id: true },
  });

  await prisma.artistSubmission.update({
    where: { id: sub.id },
    data: { publishedSongId: song.id },
  });

  return { ok: true, songId: song.id, alreadyPublished: false, verdict };
}

/**
 * Auto-publish path for when the station grows past hand-review. No-op unless
 * SUBMISSION_AUTO_APPROVE=1 AND the submission is spotless (passes every check
 * with zero warnings — see evaluateSubmissionRequirements). When it fires it
 * publishes the song and marks the submission APPROVED, no human in the loop.
 * This is the seam an AI reviewer plugs into: replace the autoApprovable rule
 * with a model verdict and this path starts clearing confident submissions.
 */
export async function autoPublishIfEligible(
  submissionId: string,
): Promise<{ autoPublished: boolean; songId?: string }> {
  const sub = await prisma.artistSubmission.findUnique({ where: { id: submissionId } });
  if (!sub || sub.publishedSongId) return { autoPublished: false };

  const verdict = evaluateSubmissionRequirements(sub);
  if (!verdict.autoApprovable) return { autoPublished: false };

  const result = await publishApprovedSubmission(submissionId);
  if (!result.ok) return { autoPublished: false };

  await prisma.artistSubmission.update({
    where: { id: submissionId },
    data: { status: "APPROVED" },
  });
  return { autoPublished: true, songId: result.songId };
}
