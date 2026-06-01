/**
 * Image Upload API Route — POST /api/upload
 *
 * Accepts an image file from the client, validates it, then stores it using
 * one of two backends depending on the runtime environment:
 *
 * 1. Vercel Blob (production) — uploads to Vercel's CDN-backed object storage.
 *    Returns a full CDN URL. Requires BLOB_READ_WRITE_TOKEN in env.
 *
 * 2. Local filesystem (dev) — saves to ./uploads/ folder on disk.
 *    Returns a relative URL (/api/uploads/{filename}) served by
 *    /api/uploads/[key]/route.ts.
 *
 * Validation:
 *   - Requires authenticated user (returns 401 if not)
 *   - Accepts: image/jpeg, image/png, image/gif, image/webp
 *   - Max file size: 5 MB
 *
 * @returns JSON { url: string }
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import { put } from "@vercel/blob";
import { auth } from "~/server/auth";
import { env } from "~/env";

export async function POST(req: NextRequest) {
  // ── Auth Check ───────────────────────────────────────────────────────────
  // Only authenticated users can upload images
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse the Uploaded File ──────────────────────────────────────────────
  // Client sends multipart/form-data with a "file" field
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // ── Validate File Type ───────────────────────────────────────────────────
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  // ── Validate File Size ───────────────────────────────────────────────────
  // 5 MB limit (matches Vercel Blob free tier limits)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  // ── Generate Unique Filename ─────────────────────────────────────────────
  // UUID prevents name collisions and path-traversal attacks
  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${uuid()}.${ext}`;

  // ── Storage Backend Decision ─────────────────────────────────────────────
  if (env.BLOB_READ_WRITE_TOKEN) {
    // ── Path A: Vercel Blob (Cloud, production) ───────────────────────────
    // put() streams the file directly to Vercel Blob without loading into memory.
    // Returns a public CDN URL like https://store-id.public.blob.vercel-storage.com/uuid.jpg
    try {
      const blob = await put(filename, file, {
        access: "public",
        contentType: file.type,
        addRandomSuffix: false,  // UUID already provides uniqueness
      });
      return NextResponse.json({ url: blob.url });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Blob upload failed:", message);
      return NextResponse.json({ error: `Image upload failed: ${message}` }, { status: 500 });
    }
  } else {
    // ── Path B: Local Filesystem (Dev Fallback) ───────────────────────────
    // Saves to ./uploads/ and returns a relative URL.
    // WARNING: Does NOT work on Vercel (serverless has ephemeral filesystem).
    // The file is served by the GET proxy at /api/uploads/[key].
    const dir = path.join(process.cwd(), "uploads");
    await mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buffer);
    return NextResponse.json({ url: `/api/uploads/${filename}` });
  }
}
