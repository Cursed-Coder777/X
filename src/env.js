/**
 * Environment variable validation using Zod and @t3-oss/env-nextjs.
 * Ensures all required env vars (AUTH_SECRET, DATABASE_URL, etc.) are present
 * and correctly typed at build/start time. Fails fast if validation fails.
 */

// createEnv from t3-env validates server and client env vars separately
import { createEnv } from "@t3-oss/env-nextjs";
// Zod runtime validation library for schema definitions
import { z } from "zod";

// Validate and export a typed `env` object — accessing any unlisted or
// incorrectly-typed variable throws at build/start time
export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    // AUTH_SECRET: required in production but optional in dev (NextAuth
    // can auto-generate a development secret)
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    // Discord OAuth credentials
    AUTH_DISCORD_ID: z.string(),
    AUTH_DISCORD_SECRET: z.string(),
    // Database connection string (SQLite / Turso / PostgreSQL)
    DATABASE_URL: z.string().url(),
    // Current Node environment — defaults to "development"
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    /**
     * Vercel Blob read-write token for image uploads in production.
     * Optional here — the upload route checks at runtime and falls back to
     * local filesystem if absent (useful for local dev without Blob setup).
     * Get this from your Vercel Dashboard → Storage → Create Blob Store.
     */
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
    BLOB_STORE_ID: z.string().optional(),
    TURSO_AUTH_TOKEN: z.string().optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // Next.js requires at least one key — add public vars here when needed
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  // Map each env key to its runtime value so Next.js can bundle the
  // client-side subset during the build step
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_DISCORD_ID: process.env.AUTH_DISCORD_ID,
    AUTH_DISCORD_SECRET: process.env.AUTH_DISCORD_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    BLOB_STORE_ID: process.env.BLOB_STORE_ID,
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN,
    NODE_ENV: process.env.NODE_ENV,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
