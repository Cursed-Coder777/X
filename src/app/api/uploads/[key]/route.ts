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

// NextRequest and NextResponse are the standard fetch-based types in the Next.js App Router
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
// readFile reads the image file from disk as a Buffer
import { readFile } from "fs/promises";
// path is used to construct safe, cross-platform filesystem paths
import path from "path";

// GET handler — receives the filename (key) as a dynamic route parameter
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  // ========================
  // SANITIZE THE FILENAME
  // ========================
  // Strip any character that is not alphanumeric, dot, hyphen, or underscore.
  // This prevents path-traversal attacks like "../../etc/passwd".
  const { key } = await params;
  const safe = key.replace(/[^a-zA-Z0-9._-]/g, "");
  // Build the absolute path to the file inside the uploads directory
  const filePath = path.join(process.cwd(), "uploads", safe);

  try {
    // Read the file content from disk as a Buffer
    const buffer = await readFile(filePath);
    // Determine the file extension to map it to a MIME type
    const ext = safe.split(".").pop()?.toLowerCase() ?? "";
    // MIME type lookup for supported image formats
    const mime: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
    };
    // Return the image with the correct Content-Type header
    return new NextResponse(buffer, {
      headers: { "Content-Type": mime[ext] ?? "application/octet-stream" },
    });
  } catch {
    // If the file doesn't exist or can't be read, return 404
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
