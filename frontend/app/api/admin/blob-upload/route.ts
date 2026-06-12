import { auth } from "@/auth";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mints short-lived client-upload tokens so the admin can drag an audio file
// straight into the ingest panel — the browser uploads to Blob directly
// (no 50MB+ files through our functions). Uploads land under sources/ in the
// PUBLIC masters store; the worker then masters from that URL like any other.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.MASTERS_BLOB_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return Response.json({ error: "Blob storage is not configured." }, { status: 503 });
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      token,
      onBeforeGenerateToken: async (pathname) => ({
        allowedContentTypes: [
          "audio/mpeg",
          "audio/mp3",
          "audio/wav",
          "audio/x-wav",
          "audio/mp4",
          "audio/m4a",
          "audio/x-m4a",
          "audio/aac",
          "audio/flac",
          "audio/ogg",
        ],
        maximumSizeInBytes: 200 * 1024 * 1024,
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ pathname }),
      }),
      // Upload completion is observed client-side; nothing to persist here —
      // the resulting URL goes into the ingest form as the source.
      onUploadCompleted: async () => {},
    });
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Upload failed." },
      { status: 400 },
    );
  }
}
