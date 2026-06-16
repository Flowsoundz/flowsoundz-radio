import { prisma } from "@/lib/prisma";
import { runAI, extractTag } from "@/lib/creatorHub/aiEngine";

// Auto-triage a new artist submission: an AI curator take + tags + a
// recommendation (approve / revisit / reject) + confidence, stored on the
// submission so a human reviewer starts with context instead of a blank slate.
// Advisory only — the curator still decides. Fire-and-forget from intake.
export async function triageSubmission(submissionId: string): Promise<void> {
  const s = await prisma.artistSubmission.findUnique({ where: { id: submissionId } });
  if (!s) return;
  // Don't redo a triage that already ran.
  if (s.aiTriagedAt) return;

  const userPrompt = [
    "Triage this artist submission for FlowSoundz Radio (late-night, cinematic, discovery-first independent radio).",
    "Give an honest internal curator take — would this fit the rotation, and why.",
    "",
    `Artist: ${s.artistName}`,
    `Track: ${s.songTitle}`,
    `Genre: ${s.genre}`,
    `Vibe: ${s.vibe}`,
    `Artist type: ${s.artistType}`,
    s.aiUsed ? `AI-assisted: yes${s.aiTool ? ` (${s.aiTool})` : ""}` : "AI-assisted: no",
    s.description ? `Artist description: ${s.description}` : "",
    s.notes ? `Notes: ${s.notes}` : "",
    "",
    "Output ONLY these tagged blocks, nothing else:",
    "<summary>2–3 sentence curator take. Specific and honest — what works, what's risky for this rotation.</summary>",
    "<tags>3–5 comma-separated genre/vibe/style tags relevant to FlowSoundz rotation.</tags>",
    "<recommendation>One word: approve, revisit, or reject</recommendation>",
    "<confidence>One word: high, medium, or low</confidence>",
  ]
    .filter(Boolean)
    .join("\n");

  let raw: string;
  try {
    raw = await runAI(userPrompt, 600);
  } catch {
    return; // AI unavailable — leave untriaged, never block the pipeline
  }
  if (!raw) return;

  const summary = extractTag(raw, "summary") || null;
  const tagsRaw = extractTag(raw, "tags");
  const rec = (extractTag(raw, "recommendation") || "").toLowerCase().trim();
  const conf = (extractTag(raw, "confidence") || "").toLowerCase().trim();
  const recommendation = ["approve", "revisit", "reject"].includes(rec) ? rec : null;
  const confidence = ["high", "medium", "low"].includes(conf) ? conf : null;
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 6) : [];

  await prisma.artistSubmission
    .update({
      where: { id: submissionId },
      data: { aiSummary: summary, aiTags: tags, aiRecommendation: recommendation, aiConfidence: confidence, aiTriagedAt: new Date() },
    })
    .catch(() => undefined);
}
