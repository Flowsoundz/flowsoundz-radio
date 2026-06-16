import type { NextRequest } from "next/server";
import type { ArtistPromoOutput } from "@/lib/creatorHub/generators";
import { createArtistSubmission } from "@/lib/artistSubmissionStore";
import { autoPublishIfEligible } from "@/lib/publishSubmission";
import { triageSubmission } from "@/lib/creatorHub/triage";
import {
  sendArtistSubmissionNotification,
  sendArtistSubmissionConfirmation,
} from "@/lib/mailer";
import { runAI, extractTag, extractList } from "@/lib/creatorHub/aiEngine";

export const runtime = "nodejs";

type SubmitRequest = {
  artistName?: unknown;
  contactName?: unknown;
  email?: unknown;
  songTitle?: unknown;
  genre?: unknown;
  vibe?: unknown;
  artistType?: unknown;
  description?: unknown;
  songLink?: unknown;
  versionType?: unknown;
  producerCredit?: unknown;
  streamingLink?: unknown;
  coverArtLink?: unknown;
  socialLink?: unknown;
  aiUsed?: unknown;
  aiTool?: unknown;
  rightsConfirmed?: unknown;
  samplesConfirmed?: unknown;
  promotionPermissionConfirmed?: unknown;
  removalPolicyConfirmed?: unknown;
  notes?: unknown;
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

const VALID_VIBES = ["Chill", "Hype", "Late Night", "Emotional", "Unsure"] as const;
type Vibe = (typeof VALID_VIBES)[number];

function sanitizeVibe(v: unknown): Vibe {
  const s = str(v);
  return (VALID_VIBES as readonly string[]).includes(s) ? (s as Vibe) : "Chill";
}


function fallbackPromo(
  artistName: string,
  songTitle: string,
  genre: string,
  vibe: string,
  artistType: string,
  description: string,
): ArtistPromoOutput {
  const a = artistName || "This artist";
  const s = songTitle || "this track";
  const g = genre || "independent music";
  const v = vibe || "late night";
  const t = artistType || "independent artist";
  return {
    bio: `${a} is a ${t} carving out a distinctive sound in the ${g} space. Their latest release "${s}" captures ${v} energy — intentional, raw, and built for discovery. Follow their journey on FlowSoundz Radio and catch them before the mainstream catches on.`,
    suggestedVibe: vibe || "Chill",
    promoBlurb:
      description.length > 10
        ? `Up next on FlowSoundz Radio — ${a} with "${s}". ${description.slice(0, 90)}${description.length > 90 ? "…" : ""}`
        : `Up next on FlowSoundz Radio — ${a} with "${s}". Pure ${g} energy, curated just for you.`,
    radioIntro: `This is FlowSoundz Radio. You are about to hear "${s}" by ${a}. Stay locked in.`,
    socialCaptions: [
      `${a} just landed on the FlowSoundz radar with "${s}" — ${v.toLowerCase()} energy and a clear point of view.`,
      `Now in the FlowSoundz discovery lane: "${s}" by ${a}. ${g} roots, curated with intent.`,
      `Independent music worth sitting with: "${s}" by ${a}, now in the FlowSoundz conversation.`,
    ],
  };
}


export async function POST(request: NextRequest) {
  let body: SubmitRequest;
  try {
    body = (await request.json()) as SubmitRequest;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const artistName = str(body.artistName);
  const contactName = str(body.contactName);
  const email = str(body.email);
  const songTitle = str(body.songTitle);
  const genre = str(body.genre);
  const vibe = sanitizeVibe(body.vibe);
  const artistType = str(body.artistType) || "Independent Artist";
  const description = str(body.description);
  const songLink = str(body.songLink);
  const versionType = str(body.versionType) || "Clean";
  const producerCredit = str(body.producerCredit);
  const streamingLink = str(body.streamingLink);
  const coverArtLink = str(body.coverArtLink);
  const socialLink = str(body.socialLink);
  const aiUsed = Boolean(body.aiUsed);
  const aiTool = str(body.aiTool);
  const rightsConfirmed = Boolean(body.rightsConfirmed);
  const samplesConfirmed = Boolean(body.samplesConfirmed);
  const promotionPermissionConfirmed = Boolean(body.promotionPermissionConfirmed);
  const removalPolicyConfirmed = Boolean(body.removalPolicyConfirmed);
  const notes = str(body.notes);

  if (!artistName || !contactName || !email || !songTitle || !genre || !songLink) {
    return Response.json(
      {
        error:
          "artistName, contactName, email, songTitle, genre, and songLink are required.",
      },
      { status: 422 },
    );
  }

  if (
    !rightsConfirmed ||
    !samplesConfirmed ||
    !promotionPermissionConfirmed ||
    !removalPolicyConfirmed
  ) {
    return Response.json(
      { error: "All permission confirmations are required before submission." },
      { status: 422 },
    );
  }

  const aiLine = aiUsed && aiTool
    ? `AI tools used: ${aiTool}.`
    : aiUsed
      ? "Artist used AI tools in the creation process."
      : "No AI tools disclosed.";

  const userPrompt = [
    "Generate promotional assets for a FlowSoundz Radio artist submission.",
    "",
    "── TRACK DETAILS ──",
    `Artist: ${artistName}`,
    `Track: "${songTitle}"`,
    `Genre: ${genre}`,
    `Vibe: ${vibe}`,
    `Artist type: ${artistType}`,
    `Version: ${versionType}`,
    producerCredit ? `Producer credit: ${producerCredit}` : "",
    description ? `Artist description: ${description}` : "",
    aiLine,
    "",
    "── OUTPUT FORMAT ──",
    "Return ONLY the two tagged blocks below. Nothing else.",
    "",
    "<artist_assets>",
    "<bio>",
    "3-sentence artist bio in third person. Specific, human, genre-authentic. Not corporate.",
    "</bio>",
    "<vibe>",
    "Exactly one of: Chill, Hype, Late Night, Emotional",
    "</vibe>",
    "<promo_blurb>",
    "1-2 sentences the station reads to introduce this track. Radio-ready, underground energy.",
    "</promo_blurb>",
    "<radio_intro>",
    "One sentence. The DJ line read right before the track drops. Short, confident, no fluff.",
    "</radio_intro>",
    "</artist_assets>",
    "",
    "<social_captions>",
    "<caption_1>Caption for discovery post — 1-2 sentences, punchy.</caption_1>",
    "<caption_2>Caption for artist spotlight — highlights the sound or story.</caption_2>",
    "<caption_3>Caption for general announcement — broad appeal, clear CTA.</caption_3>",
    "</social_captions>",
  ].filter(Boolean).join("\n");

  let promo: ArtistPromoOutput;

  const raw = await runAI(userPrompt, 1400);

  if (!raw) {
    promo = fallbackPromo(artistName, songTitle, genre, vibe, artistType, description);
  } else {
    const fb = fallbackPromo(artistName, songTitle, genre, vibe, artistType, description);

    const bio = extractTag(raw, "bio") || fb.bio;
    const vibeTag = sanitizeVibe(extractTag(raw, "vibe"));
    const promoBlurb = extractTag(raw, "promo_blurb") || fb.promoBlurb;
    const radioIntro = extractTag(raw, "radio_intro") || fb.radioIntro;
    const captions = [
      extractTag(raw, "caption_1"),
      extractTag(raw, "caption_2"),
      extractTag(raw, "caption_3"),
    ].filter(Boolean);

    promo = {
      bio,
      suggestedVibe: vibeTag || fb.suggestedVibe,
      promoBlurb,
      radioIntro,
      socialCaptions: captions.length >= 2 ? captions : fb.socialCaptions,
    };
  }

  // Fire-and-forget — don't fail the submission if emails fail
  void sendArtistSubmissionNotification({
    artistName,
    contactName,
    email,
    songTitle,
    genre,
    vibe,
    artistType,
    description,
    songLink,
    versionType,
    producerCredit: producerCredit || undefined,
    streamingLink: streamingLink || undefined,
    coverArtLink: coverArtLink || undefined,
    socialLink: socialLink || undefined,
    aiUsed,
    aiTool: aiTool || undefined,
    rightsConfirmed,
    samplesConfirmed,
    promotionPermissionConfirmed,
    removalPolicyConfirmed,
    notes: notes || undefined,
    bio: promo.bio,
    promoBlurb: promo.promoBlurb,
    radioIntro: promo.radioIntro,
    socialCaptions: promo.socialCaptions,
    suggestedVibe: promo.suggestedVibe,
    submittedAt: new Date().toISOString(),
  }).catch(() => undefined);

  // Artist confirmation fires before DB write so it always sends regardless of
  // database configuration. Admin email already fires above for the same reason.
  void sendArtistSubmissionConfirmation({
    artistName,
    contactName,
    email,
    songTitle,
    genre,
    vibe,
    bio: promo.bio,
    promoBlurb: promo.promoBlurb,
    radioIntro: promo.radioIntro,
    suggestedVibe: promo.suggestedVibe,
    submissionId: null,
  }).catch(() => undefined);

  // DB write is best-effort. If DATABASE_URL is not configured (e.g. early-stage
  // Vercel deployments), the submission is captured via email and the response
  // still returns the AI promo assets so the confirmation page works.
  try {
    const submission = await createArtistSubmission({
      artist_name: artistName,
      contact_name: contactName,
      email,
      song_title: songTitle,
      genre,
      vibe,
      artist_type: artistType,
      description,
      song_link: songLink,
      version_type: versionType,
      producer_credit: producerCredit || null,
      streaming_link: streamingLink || null,
      cover_art_link: coverArtLink || null,
      social_link: socialLink || null,
      ai_used: aiUsed,
      ai_tool: aiTool || null,
      rights_confirmed: rightsConfirmed,
      samples_confirmed: samplesConfirmed,
      promotion_permission_confirmed: promotionPermissionConfirmed,
      removal_policy_confirmed: removalPolicyConfirmed,
      notes: notes || null,
      artist_feedback: null,
      promo,
    });

    // AI triage — fire-and-forget curator take + tags + recommendation so the
    // admin queue starts pre-sorted. Never blocks the artist's response.
    if (submission.submission_id) {
      void triageSubmission(submission.submission_id).catch(() => undefined);
    }

    // Auto-publish path — no-op unless SUBMISSION_AUTO_APPROVE=1 and the
    // submission is spotless. Fire-and-forget so the artist's response isn't
    // held up by mastering enqueue.
    if (process.env.SUBMISSION_AUTO_APPROVE === "1" && submission.submission_id) {
      void autoPublishIfEligible(submission.submission_id).catch(() => undefined);
    }

    return Response.json({ ...promo, submission_id: submission.submission_id });
  } catch {
    // DB unavailable — return promo assets without a submission_id.
    // Both admin and artist emails were already sent above.
    return Response.json({ ...promo, submission_id: null });
  }
}
