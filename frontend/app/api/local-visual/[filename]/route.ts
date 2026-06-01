import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const VISUALS_DIR = path.resolve(process.cwd(), "../backend/media/visuals");
const LOCAL_MEDIA_UNAVAILABLE_MESSAGE =
  "Local artist visuals are not available on this deployment. Connect the backend media service to enable visual playback.";

function getContentType(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mov")) return "video/quicktime";
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
  const filePath = path.resolve(VISUALS_DIR, decoded);

  if (!filePath.startsWith(VISUALS_DIR + path.sep) && filePath !== VISUALS_DIR) {
    return NextResponse.json({ error: "Invalid file path." }, { status: 400 });
  }

  let fileSize: number;
  try {
    const info = await stat(filePath);
    fileSize = info.size;
  } catch {
    return NextResponse.json({ error: "Visual file not found." }, { status: 404 });
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
      console.error("[local-visual] Failed to read visual file", { decoded, error });
      return NextResponse.json({ error: "Visual file not found." }, { status: 404 });
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
    console.error("[local-visual] Failed to read visual file", { decoded, error });
    return NextResponse.json({ error: "Visual file not found." }, { status: 404 });
  }
}
