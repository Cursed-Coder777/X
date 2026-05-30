/**
 * Image Serve API Route — LOCAL DEV ONLY
 *
 * WHAT THIS DOES:
 *   Reads an uploaded image from the local filesystem and returns it.
 *
 * WHEN IS THIS USED:
 *   Only during local development when BLOB_READ_WRITE_TOKEN is NOT set.
 *   In that scenario, the upload route saves files to ./uploads/ and returns
 *   a relative URL like /api/uploads/filename.jpg. This route serves those files.
 *
 * WHAT HAPPENS IN PRODUCTION (Vercel):
 *   The upload route returns a full Vercel Blob URL
 *   (e.g., https://xyz.public.blob.vercel-storage.com/filename.jpg).
 *   That URL is stored in the database and loaded directly by <img> tags.
 *   This route is NEVER called in production because no database record
 *   will contain a relative /api/uploads/... URL.
 *
 * SECURITY:
 *   The key is sanitized with a regex to prevent path-traversal attacks
 *   (e.g., someone requesting /api/uploads/../../../etc/passwd).
 *   Only alphanumeric chars, dots, hyphens, and underscores are allowed.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  // Sanitize the filename to prevent directory traversal attacks
  const { key } = await params;
  const safe = key.replace(/[^a-zA-Z0-9._-]/g, "");
  const filePath = path.join(process.cwd(), "uploads", safe);

  try {
    const buffer = await readFile(filePath);
    const ext = safe.split(".").pop()?.toLowerCase() ?? "";
    const mime: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
    };
    return new NextResponse(buffer, {
      headers: { "Content-Type": mime[ext] ?? "application/octet-stream" },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
