import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SONGS_DIR = path.resolve(process.cwd(), "../backend/media/songs");
const LOCAL_MEDIA_UNAVAILABLE_MESSAGE =
  "Local audio streaming is not available on this deployment. Connect the backend media service to enable playback.";

function getContentType(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".m4a")) return "audio/mp4";
  return "application/octet-stream";
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ filename: string }> },
) {
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: LOCAL_MEDIA_UNAVAILABLE_MESSAGE },
      { status: 503 },
    );
  }

  const { filename } = await props.params;
  const decoded = decodeURIComponent(filename);
  const filePath = path.resolve(SONGS_DIR, decoded);

  if (!filePath.startsWith(SONGS_DIR + path.sep) && filePath !== SONGS_DIR) {
    return NextResponse.json({ error: "Invalid file path." }, { status: 400 });
  }

  let fileSize: number;
  try {
    const info = await stat(filePath);
    fileSize = info.size;
  } catch {
    return NextResponse.json({ error: "Audio file not found." }, { status: 404 });
  }

  const contentType = getContentType(decoded);
  const rangeHeader = request.headers.get("range");

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (!match) {
      return new NextResponse("Invalid Range", { status: 416 });
    }

    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize || start > end) {
      return new NextResponse("Range Not Satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      });
    }

    try {
      const buffer = await readFile(filePath);
      const chunk = buffer.subarray(start, end + 1);
      return new NextResponse(chunk, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunk.byteLength),
          "Content-Type": contentType,
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      console.error("[local-stream] Failed to read audio file", { decoded, error });
      return NextResponse.json({ error: "Audio file not found." }, { status: 404 });
    }
  }

  try {
    const file = await readFile(filePath);
    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileSize),
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[local-stream] Failed to read audio file", { decoded, error });
    return NextResponse.json({ error: "Audio file not found." }, { status: 404 });
  }
}
