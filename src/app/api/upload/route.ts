/**
 * Image Upload API Route
 *
 * WHAT THIS DOES:
 *   Receives an image file from the client, validates it, then saves it.
 *
 * TWO STORAGE BACKENDS (based on whether BLOB_READ_WRITE_TOKEN is set):
 *
 *   1. Vercel Blob (production / explicit token) — the recommended approach
 *      - Uploads the file to Vercel's CDN-backed object storage
 *      - Returns a full public URL like https://xyz.public.blob.vercel-storage.com/uuid.jpg
 *      - Images are served directly from Vercel's edge — fast, no server load
 *      - Works on serverless (Vercel), doesn't need local disk
 *      - Set up: Vercel Dashboard → Storage → Create Blob Store → copy token to .env
 *
 *   2. Local filesystem (dev fallback, no token)
 *      - Saves to ./uploads/ folder on your machine
 *      - Returns a relative URL like /api/uploads/uuid.jpg
 *      - The GET route at /api/uploads/[key] serves the file from disk
 *      - Works locally without needing a cloud account
 *      - WON'T work on Vercel (serverless has ephemeral filesystem)
 *
 * HOW THE URL IS USED:
 *   The returned URL gets stored in the database (Post.imageUrl, User.image, etc.)
 *   The frontend just uses it as an <img src="..."> — no special handling needed.
 *
 * @returns JSON { url: string }
 */

// NextRequest and NextResponse are the standard fetch-based request/response types in Next.js App Router
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
// writeFile and mkdir are Node.js promise-based filesystem functions for local storage
import { writeFile, mkdir } from "fs/promises";
// path is used to construct safe filesystem paths (avoids string concatenation)
import path from "path";
// uuid v4 generates unique, unpredictable file names to prevent collisions and traversal attacks
import { v4 as uuid } from "uuid";
// put is the Vercel Blob SDK function that uploads a file to the cloud blob store
import { put } from "@vercel/blob";
// auth retrieves the current session to enforce authentication
import { auth } from "~/server/auth";
// env provides validated environment variables including BLOB_READ_WRITE_TOKEN
import { env } from "~/env";

// POST handler — only method supported; uploads are always a form submission
export async function POST(req: NextRequest) {
  // ========================
  // AUTH CHECK
  // ========================
  // Only logged-in users can upload. Returns 401 if no valid session exists.
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ========================
  // PARSE THE UPLOADED FILE
  // ========================
  // The client sends a multipart/form-data with a "file" field
  // (see CreatePost.tsx / EditProfileModal.tsx for the client side)
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // ========================
  // VALIDATE FILE TYPE
  // ========================
  // Only allow common image formats. The browser sets the MIME type automatically.
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  // ========================
  // VALIDATE FILE SIZE
  // ========================
  // 5 MB limit. Vercel Blob free tier permits up to 5 MB per file anyway.
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  // ========================
  // GENERATE UNIQUE FILENAME
  // ========================
  // UUID prevents name collisions and path-traversal attacks.
  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${uuid()}.${ext}`;

  // ========================
  // DECIDE STORAGE BACKEND
  // ========================
  // If BLOB_READ_WRITE_TOKEN is set → Vercel Blob (production-like).
  // Otherwise → local filesystem (dev-only fallback).
  if (env.BLOB_READ_WRITE_TOKEN) {
    // ============================
    // PATH A: VERCEL BLOB (CLOUD)
    // ============================
    //
    // put() uploads the file directly to Vercel Blob storage.
    // We pass the File object directly (not a Buffer) so it streams
    // without loading the entire file into memory.
    //   - addRandomSuffix: false — our UUID already provides uniqueness
    //   - access: "public" — the returned URL is publicly accessible
    //   - contentType: passed explicitly so the CDN sets the correct MIME type
    //
    // The returned `url` is a full CDN URL like:
    //   https://<store-id>.public.blob.vercel-storage.com/uuid.jpg
    try {
      const blob = await put(filename, file, {
        access: "public",
        contentType: file.type,
        addRandomSuffix: false,
      });
      return NextResponse.json({ url: blob.url });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Blob upload failed:", message);
      return NextResponse.json(
        { error: `Image upload failed: ${message}` },
        { status: 500 },
      );
    }
  } else {
    // ============================
    // PATH B: LOCAL FILESYSTEM (DEV FALLBACK)
    // ============================
    //
    // Runs when there is no BLOB_READ_WRITE_TOKEN (usually local dev).
    // Files are saved to ./uploads/ and served via the proxy route at /api/uploads/[key].
    //
    // Why not use Blob all the time?
    //   So you don't need a Vercel Blob store just to run the app locally.
    //
    // Will this work on Vercel?
    //   NO. Vercel serverless functions have an ephemeral filesystem —
    //   files written here will disappear after the request ends.
    //   That's why we use Blob when deployed.
    const dir = path.join(process.cwd(), "uploads");
    // Ensure the uploads directory exists (creates it recursively if needed)
    await mkdir(dir, { recursive: true });
    // Convert the File to a Buffer so we can write it to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buffer);

    // Return a relative URL — the frontend prepends the origin automatically
    return NextResponse.json({ url: `/api/uploads/${filename}` });
  }
}
