/**
 * Environment variable validation using Zod and @t3-oss/env-nextjs.
 *
 * This module:
 * 1. Defines Zod schemas for every expected environment variable
 * 2. Validates them at build/start time
 * 3. Exports a typed `env` object for safe access throughout the app
 *
 * Fails fast with a clear error if a required variable is missing or
 * incorrectly typed.
 */

// createEnv from t3-env validates server and client env vars separately
import { createEnv } from "@t3-oss/env-nextjs";
// Zod runtime validation library for schema definitions
import { z } from "zod";

// Validate and export a typed `env` object — accessing any unlisted or
// incorrectly-typed variable throws at build/start time
export const env = createEnv({
  /**
   * Server-side environment variables schema.
   * These variables are only available on the server (never exposed to the
   * browser). Access violations in client code will throw at build time.
   */
  server: {
    // AUTH_SECRET: required in production but optional in dev (NextAuth
    // can auto-generate a development secret for local dev convenience)
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),

    // AUTH_DISCORD_ID / AUTH_DISCORD_SECRET: Discord OAuth credentials
    // used by NextAuth's Discord provider for social login
    AUTH_DISCORD_ID: z.string(),
    AUTH_DISCORD_SECRET: z.string(),

    // DATABASE_URL: Connection string for the database.
    // Local dev: "file:./prisma/db.sqlite" — Production: Turso libsql:// URL
    DATABASE_URL: z.string().url(),

    // NODE_ENV: Current runtime environment — defaults to "development"
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    /**
     * Vercel Blob read-write token for image uploads in production.
     * Optional here — the upload route checks at runtime and falls back to
     * local filesystem if absent (useful for local dev without Blob setup).
     * Get this from: Vercel Dashboard → Storage → Create Blob Store
     */
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
    BLOB_STORE_ID: z.string().optional(),

    // TURSO_AUTH_TOKEN: Required only when using Turso (production).
    // Not needed for local SQLite dev.
    TURSO_AUTH_TOKEN: z.string().optional(),
  },

  /**
   * Client-side environment variables schema.
   * To expose a variable to the browser, prefix it with NEXT_PUBLIC_.
   * The runtimeEnv mapping below is still required for all such variables.
   */
  client: {
    // Placeholder for future public variables:
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * Runtime value mapping.
   * Each key in the schemas above must be mapped to its process.env value.
   * Next.js needs this to properly bundle client-side env vars at build time,
   * since you cannot destructure `process.env` in edge runtimes or client code.
   */
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
   * Skip validation flag.
   * Set SKIP_ENV_VALIDATION=true to bypass env checks (useful in Docker builds
   * where certain env vars may not be available at build time).
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  /**
   * Empty string handling.
   * Treats empty strings as undefined, so `SOME_VAR: z.string()` with
   * `SOME_VAR=''` will throw an error rather than silently passing.
   */
  emptyStringAsUndefined: true,
});
