/**
 * Image Serve API Route — GET /api/uploads/[key]
 *
 * LOCAL DEV ONLY — serves uploaded images from the local filesystem when
 * Vercel Blob is not configured.
 *
 * How it works:
 *   1. The upload route (POST /api/upload) saves files to ./uploads/ and
 *      returns a relative URL like /api/uploads/{filename}.
 *   2. This route reads the file from disk and returns it with the correct
 *      Content-Type header.
 *
 * In production:
 *   Uploads go to Vercel Blob and return a full CDN URL. This route is never
 *   called because no database record will contain a /api/uploads/ URL.
 *
 * Security:
 *   The filename is sanitised to prevent path-traversal attacks. Only
 *   alphanumeric characters, dots, hyphens, and underscores are allowed.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  // ── Sanitise the filename ──────────────────────────────────────────────
  // Strip any character that isn't alphanumeric, dot, hyphen, or underscore.
  // This prevents path-traversal attacks (e.g. ../../../etc/passwd).
  const { key } = await params;
  const safe = key.replace(/[^a-zA-Z0-9._-]/g, "");
  const filePath = path.join(process.cwd(), "uploads", safe);

  try {
    // Read the file from disk
    const buffer = await readFile(filePath);
    // Determine MIME type from the file extension
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
