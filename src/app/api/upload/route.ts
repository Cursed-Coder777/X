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
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import { put } from "@vercel/blob";
import { auth } from "~/server/auth";
import { env } from "~/env";

export async function POST(req: NextRequest) {
  // --- AUTH CHECK ---
  // Only logged-in users can upload. Same guard as all other protected routes.
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- PARSE THE UPLOADED FILE ---
  // The client sends a multipart/form-data with a "file" field (see CreatePost.tsx / EditProfileModal.tsx)
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // --- VALIDATE FILE TYPE ---
  // Only allow common image formats. Browsers set the MIME type automatically.
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  // --- VALIDATE FILE SIZE ---
  // 5 MB limit. Vercel Blob free tier allows up to 5 MB per file anyway.
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  // --- GENERATE A UNIQUE FILENAME ---
  // UUID prevents name collisions and path-traversal attacks.
  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${uuid()}.${ext}`;

  // --- DECIDE STORAGE BACKEND ---
  // If BLOB_READ_WRITE_TOKEN exists → Vercel Blob (production-like)
  // Otherwise → local filesystem (dev only)
  if (env.BLOB_READ_WRITE_TOKEN) {
    // ======================
    // PATH A: VERCEL BLOB
    // ======================
    //
    // put() uploads the raw file bytes to Vercel Blob storage.
    // - access: "public" — makes the URL publicly accessible (no auth needed to view images)
    // - The returned `url` is a full CDN URL like:
    //   https://<store-id>.public.blob.vercel-storage.com/uuid.jpg
    //
    // How it works on Vercel:
    //   Vercel automatically sets BLOB_READ_WRITE_TOKEN when you add Blob storage
    //   in the dashboard. No extra config needed.
    //
    // How it works locally:
    //   You can also use Blob locally by creating a .env with BLOB_READ_WRITE_TOKEN
    //   copied from your Vercel dashboard. This gives you dev/prod parity.
    const buffer = Buffer.from(await file.arrayBuffer());
    const blob = await put(filename, buffer, {
      access: "public",
      contentType: file.type,
    });

    // blob.url is the public URL — store this in your database
    return NextResponse.json({ url: blob.url });
  } else {
    // ======================
    // PATH B: LOCAL FILESYSTEM (dev fallback)
    // ======================
    //
    // This runs when there's no BLOB_READ_WRITE_TOKEN (usually local dev).
    // Files are saved to ./uploads/ and served via the proxy route at /api/uploads/[key].
    //
    // Why not use Blob all the time?
    //   So you don't need to set up a Vercel Blob store just to run the app locally.
    //
    // Will this work on Vercel?
    //   NO. Vercel serverless functions have an ephemeral filesystem —
    //   files written here will disappear after the request ends.
    //   That's why we use Blob when deployed.
    const dir = path.join(process.cwd(), "uploads");
    await mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buffer);

    // Return a relative URL — the frontend will prepend the origin automatically
    return NextResponse.json({ url: `/api/uploads/${filename}` });
  }
}
