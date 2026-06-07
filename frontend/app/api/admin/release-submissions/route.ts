import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function toClientShape(s: {
  id: string; artistName: string; trackTitle: string; genre: string;
  releaseDate: string; email: string; notes: string | null;
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

export async function GET() {
  try {
    const submissions = await prisma.releaseSubmission.findMany({
      orderBy: { createdAt: "desc" },
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      artist_name?: string; track_title?: string; genre?: string;
      release_date?: string; email?: string; notes?: string;
      audio_file?: string; cover_file?: string;
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
        audioFile: body.audio_file ?? null,
        coverFile: body.cover_file ?? null,
      },
    });

    return NextResponse.json({ submission: toClientShape(submission) }, { status: 201 });
  } catch (err) {
    console.error("[release-submissions POST]", err);
    return NextResponse.json({ error: "Failed to save submission." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as {
      submission_id?: string; status?: string; internal_notes?: string;
    };

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

export async function DELETE(req: NextRequest) {
  try {
    const { submission_id } = await req.json() as { submission_id?: string };
    if (!submission_id) return NextResponse.json({ error: "Missing submission_id." }, { status: 400 });
    await prisma.releaseSubmission.delete({ where: { id: submission_id } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("[release-submissions DELETE]", err);
    return NextResponse.json({ error: "Failed to delete." }, { status: 500 });
  }
}
