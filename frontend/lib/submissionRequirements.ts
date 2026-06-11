// ─────────────────────────────────────────────────────────────────────────────
// Submission requirements engine.
//
// Decides whether an artist submission is fit to go on air. Today the rules are
// deterministic; the return shape is deliberately the same one an AI reviewer
// would produce, so when volume grows you can swap `evaluateSubmissionRequirements`
// for (or layer it under) an LLM risk assessment without touching callers.
//
// `passed`        — no blocking requirement failed; a human MAY approve.
// `autoApprovable`— passed AND clean AND the auto-approve flag is on. Until you
//                   flip SUBMISSION_AUTO_APPROVE, this is always false, so every
//                   submission still waits for a human. That's the seam: an AI
//                   step later just sets this true on high-confidence items.
// ─────────────────────────────────────────────────────────────────────────────

export type RequirementSeverity = "block" | "warn";

export type RequirementCheck = {
  id: string;
  label: string;
  ok: boolean;
  severity: RequirementSeverity;
  detail?: string;
};

export type RequirementVerdict = {
  passed: boolean;
  autoApprovable: boolean;
  checks: RequirementCheck[];
  blockingReasons: string[];
};

// Minimal shape the engine needs — both ArtistSubmission and a raw submit
// payload satisfy it.
export type SubmissionLike = {
  songTitle?: string | null;
  artistName?: string | null;
  songLink?: string | null;
  vibe?: string | null;
  rightsConfirmed?: boolean | null;
  samplesConfirmed?: boolean | null;
  promotionPermissionConfirmed?: boolean | null;
  removalPolicyConfirmed?: boolean | null;
};

const VALID_VIBES = new Set(["CHILL", "HYPE", "LATE_NIGHT", "EMOTIONAL", "UNSURE"]);

// Hosts/paths we know resolve to a directly-fetchable audio file the worker can
// master. A Suno/Udio *share page* (e.g. suno.com/song/<id>) is NOT one of these
// — the worker needs the underlying CDN file, so we flag those for a human to
// paste the direct URL.
const DIRECT_AUDIO_EXT = /\.(mp3|wav|m4a|aac|flac|ogg|opus)(\?|$)/i;
const KNOWN_AUDIO_CDN = /(^|\.)(cdn\d*\.suno\.ai|audiopipe\.suno\.ai|cdn\.udio\.com|.*\.r2\.dev|.*\.blob\.vercel-storage\.com|.*\.s3[.-])/i;

function isResolvableAudioUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return DIRECT_AUDIO_EXT.test(u.pathname) || KNOWN_AUDIO_CDN.test(u.hostname);
  } catch {
    return false;
  }
}

export function evaluateSubmissionRequirements(sub: SubmissionLike): RequirementVerdict {
  const checks: RequirementCheck[] = [];
  const title = (sub.songTitle ?? "").trim();
  const artist = (sub.artistName ?? "").trim();
  const link = (sub.songLink ?? "").trim();

  // ── Legal / rights gates (already captured at submit time) ──────────────
  checks.push({
    id: "rights",
    label: "Owns or controls the rights",
    ok: Boolean(sub.rightsConfirmed),
    severity: "block",
    detail: sub.rightsConfirmed ? undefined : "Artist did not confirm rights ownership.",
  });
  checks.push({
    id: "samples",
    label: "Samples cleared / none used",
    ok: Boolean(sub.samplesConfirmed),
    severity: "block",
    detail: sub.samplesConfirmed ? undefined : "Sample clearance not confirmed.",
  });
  checks.push({
    id: "promotion",
    label: "Granted promotion permission",
    ok: Boolean(sub.promotionPermissionConfirmed),
    severity: "block",
    detail: sub.promotionPermissionConfirmed ? undefined : "Promotion permission not granted.",
  });
  checks.push({
    id: "removal",
    label: "Accepted removal policy",
    ok: Boolean(sub.removalPolicyConfirmed),
    severity: "block",
    detail: sub.removalPolicyConfirmed ? undefined : "Removal policy not accepted.",
  });

  // ── Metadata ────────────────────────────────────────────────────────────
  checks.push({
    id: "title",
    label: "Has a title",
    ok: title.length >= 1 && title.length <= 120,
    severity: "block",
    detail: title ? undefined : "Missing track title.",
  });
  checks.push({
    id: "artist",
    label: "Has an artist name",
    ok: artist.length >= 1 && artist.length <= 120,
    severity: "block",
    detail: artist ? undefined : "Missing artist name.",
  });

  // ── Audio source ────────────────────────────────────────────────────────
  const hasLink = /^https?:\/\//.test(link);
  checks.push({
    id: "audioLink",
    label: "Has an audio link",
    ok: hasLink,
    severity: "block",
    detail: hasLink ? undefined : "No http(s) audio link provided.",
  });
  // Warn (not block): a human can still paste a direct URL on approve. This is
  // the check an AI step would later resolve automatically (follow the share
  // page → CDN file).
  const resolvable = hasLink && isResolvableAudioUrl(link);
  checks.push({
    id: "resolvableAudio",
    label: "Audio link is directly fetchable",
    ok: resolvable,
    severity: "warn",
    detail: resolvable
      ? undefined
      : "Link is not a direct audio file (likely a share page). Paste the direct CDN URL before/at approval so the worker can master it.",
  });

  // ── Vibe ────────────────────────────────────────────────────────────────
  const vibe = (sub.vibe ?? "").toUpperCase();
  checks.push({
    id: "vibe",
    label: "Valid vibe channel",
    ok: VALID_VIBES.has(vibe),
    severity: "warn",
    detail: VALID_VIBES.has(vibe) ? undefined : "Vibe unrecognized — will default to HYPE.",
  });

  const blocking = checks.filter((c) => c.severity === "block" && !c.ok);
  const warnings = checks.filter((c) => c.severity === "warn" && !c.ok);
  const passed = blocking.length === 0;

  // Auto-approval is opt-in and only for spotless submissions. Off by default —
  // every submission waits for a human until you flip the flag (or wire AI).
  const autoApproveEnabled = process.env.SUBMISSION_AUTO_APPROVE === "1";
  const autoApprovable = passed && warnings.length === 0 && autoApproveEnabled;

  return {
    passed,
    autoApprovable,
    checks,
    blockingReasons: blocking.map((c) => c.detail ?? c.label),
  };
}
