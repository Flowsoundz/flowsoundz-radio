import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { runAI, extractTag } from "@/lib/creatorHub/aiEngine";
import { sendArtistApprovalEmail } from "@/lib/mailer";

export const runtime = "nodejs";

// Admin mutations require a real admin SESSION (matches /api/admin/ingest etc.) —
// the /admin pages are already session-gated by proxy.ts, so the cookie carries
// auth automatically. Replaces the old password-in-request-body scheme.
async function isAdminSession(): Promise<boolean> {
  const session = await auth();
  return Boolean(session?.user && (session.user as { isAdmin?: boolean }).isAdmin);
}

function toClientShape(s: {
  id: string; artistName: string; trackTitle: string; genre: string;
  releaseDate: string; email: string; notes: string | null;
  lyrics: string | null;
  productionMethod: string | null;
  audioFile: string | null; coverFile: string | null;
  status: string; internalNotes: string | null;
  aiSummary: string | null; aiTags: string[];
  aiRecommendation: string | null; aiConfidence: string | null;
  aiGeneratedAt: Date | null; aiModel: string | null; createdAt: Date;
}) {
  return {
    submission_id: s.id,
    artist_name: s.artistName,
    track_title: s.trackTitle,
    genre: s.genre,
    release_date: s.releaseDate,
    email: s.email,
    notes: s.notes,
    lyrics: s.lyrics ?? null,
    production_method: s.productionMethod ?? "self_produced",
    audio_file: s.audioFile ?? undefined,
    cover_file: s.coverFile ?? undefined,
    status: s.status.toLowerCase(),
    internal_notes: s.internalNotes,
    ai_summary: s.aiSummary,
    ai_tags: s.aiTags,
    ai_recommendation: s.aiRecommendation,
    ai_confidence: s.aiConfidence,
    ai_generated_at: s.aiGeneratedAt?.toISOString() ?? null,
    ai_model: s.aiModel,
    created_at: s.createdAt.toISOString(),
  };
}

// GET — list all submissions (admin page is server-side auth protected)
export async function GET() {
  try {
    const submissions = await prisma.releaseSubmission.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({
      submissions: submissions.map(toClientShape),
      storageMode: "prisma",
    });
  } catch (err) {
    console.error("[release-submissions GET]", err);
    return NextResponse.json({ submissions: [], storageMode: "error" });
  }
}

// POST — either public intake (JSON) or admin update (FormData with password)
export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  // Admin update via FormData (from AdminReleaseSubmissionsReview component)
  if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    if (!(await isAdminSession())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const submissionId = form.get("submissionId") as string | null;
    const action = form.get("action") as string | null;
    const statusRaw = form.get("status") as string | null;
    const internalNotes = form.get("internalNotes") as string | null;

    if (!submissionId) {
      return NextResponse.json({ error: "Missing submissionId." }, { status: 400 });
    }

    const STATUS_MAP: Record<string, "RECEIVED" | "REVIEWED" | "APPROVED" | "REJECTED"> = {
      received: "RECEIVED", reviewed: "REVIEWED",
      approved: "APPROVED", rejected: "REJECTED",
    };

    if (action === "generate_ai_summary") {
      const existing = await prisma.releaseSubmission.findUnique({ where: { id: submissionId } });
      if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });

      const userPrompt = [
        "You are a music curator reviewing a release submission for FlowSoundz Radio.",
        "Write a short internal curator summary and curation tags for this submission.",
        "",
        `Artist: ${existing.artistName}`,
        `Track: ${existing.trackTitle}`,
        `Genre: ${existing.genre}`,
        `Release date: ${existing.releaseDate}`,
        existing.productionMethod ? `Production method: ${existing.productionMethod}` : "",
        existing.notes ? `Artist notes: ${existing.notes}` : "",
        existing.lyrics ? `Lyrics excerpt: ${existing.lyrics.slice(0, 400)}` : "",
        "",
        "Output only these tagged blocks:",
        "<summary>2–3 sentence internal curator take on this submission. Specific, editorial, honest.</summary>",
        "<tags>3–5 comma-separated genre/vibe/style tags relevant to FlowSoundz rotation.</tags>",
        "<recommendation>One of: approve, reject, revisit</recommendation>",
        "<confidence>One of: high, medium, low</confidence>",
      ].filter(Boolean).join("\n");

      let updated = existing;
      const raw = await runAI(userPrompt, 600);
      if (raw) {
        const summary = extractTag(raw, "summary");
        const tagsRaw = extractTag(raw, "tags");
        const recommendation = extractTag(raw, "recommendation") || null;
        const confidence = extractTag(raw, "confidence") || null;
        const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

        updated = await prisma.releaseSubmission.update({
          where: { id: submissionId },
          data: {
            aiSummary: summary || null,
            aiTags: tags,
            aiRecommendation: recommendation,
            aiConfidence: confidence,
            aiGeneratedAt: new Date(),
            aiModel: process.env.OPENAI_API_KEY ? (process.env.OPENAI_MODEL_DJ ?? "gpt-4o") : "claude-sonnet-4-20250514",
          },
        });
      }

      return NextResponse.json({ submission: toClientShape(updated) });
    }

    try {
      const newStatus = statusRaw && STATUS_MAP[statusRaw] ? STATUS_MAP[statusRaw] : null;
      const updated = await prisma.releaseSubmission.update({
        where: { id: submissionId },
        data: {
          ...(newStatus ? { status: newStatus } : {}),
          ...(internalNotes !== null ? { internalNotes: internalNotes || null } : {}),
        },
      });

      if (newStatus === "APPROVED" && updated.email) {
        void sendArtistApprovalEmail({
          contactName: updated.artistName,
          email: updated.email,
          artistName: updated.artistName,
          songTitle: updated.trackTitle,
        });
      }

      return NextResponse.json({ submission: toClientShape(updated) });
    } catch (err) {
      console.error("[release-submissions admin update]", err);
      return NextResponse.json({ error: "Failed to update submission." }, { status: 500 });
    }
  }

  // Public intake via JSON
  try {
    const body = await req.json() as {
      artist_name?: string; track_title?: string; genre?: string;
      release_date?: string; email?: string; notes?: string;
      lyrics?: string;
      production_method?: string;
    };

    if (!body.artist_name || !body.track_title || !body.email) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const submission = await prisma.releaseSubmission.create({
      data: {
        artistName: body.artist_name,
        trackTitle: body.track_title,
        genre: body.genre ?? "Other",
        releaseDate: body.release_date ?? new Date().toISOString().slice(0, 10),
        email: body.email,
        notes: body.notes ?? null,
        lyrics: body.lyrics ?? null,
        productionMethod: body.production_method ?? "self_produced",
      },
    });

    return NextResponse.json({ submission: toClientShape(submission) }, { status: 201 });
  } catch (err) {
    console.error("[release-submissions POST]", err);
    return NextResponse.json({ error: "Failed to save submission." }, { status: 500 });
  }
}

// PATCH — admin update via JSON (fallback, same password auth)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as {
      submission_id?: string; password?: string;
      status?: string; internal_notes?: string;
    };

    if (!(await isAdminSession())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (!body.submission_id) {
      return NextResponse.json({ error: "Missing submission_id." }, { status: 400 });
    }

    const STATUS_MAP: Record<string, "RECEIVED" | "REVIEWED" | "APPROVED" | "REJECTED"> = {
      received: "RECEIVED", reviewed: "REVIEWED",
      approved: "APPROVED", rejected: "REJECTED",
    };

    const updated = await prisma.releaseSubmission.update({
      where: { id: body.submission_id },
      data: {
        ...(body.status && STATUS_MAP[body.status] ? { status: STATUS_MAP[body.status] } : {}),
        ...(body.internal_notes !== undefined ? { internalNotes: body.internal_notes } : {}),
      },
    });

    return NextResponse.json({ submission: toClientShape(updated) });
  } catch (err) {
    console.error("[release-submissions PATCH]", err);
    return NextResponse.json({ error: "Failed to update submission." }, { status: 500 });
  }
}

// DELETE — password protected
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json() as { submission_id?: string };
    if (!(await isAdminSession())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (!body.submission_id) {
      return NextResponse.json({ error: "Missing submission_id." }, { status: 400 });
    }
    await prisma.releaseSubmission.delete({ where: { id: body.submission_id } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("[release-submissions DELETE]", err);
    return NextResponse.json({ error: "Failed to delete." }, { status: 500 });
  }
}
