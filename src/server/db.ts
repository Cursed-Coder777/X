/**
 * Prisma client singleton — supports both local SQLite and Turso.
 *
 * How it works:
 *   - Locally (no TURSO_AUTH_TOKEN): plain PrismaClient → local SQLite file
 *   - On Vercel (TURSO_AUTH_TOKEN set): adapter → Turso (serverless SQLite)
 *
 * The schema's datasource URL is hardcoded to "file:./db.sqlite" so Prisma's
 * validation always passes. At runtime, the adapter overrides this with
 * the actual Turso URL when deployed.
 *
 * A global singleton pattern prevents multiple PrismaClient instances in
 * development (hot-reload creates new Module instances without this guard).
 */

// PrismaClient — the ORM client generated from prisma/schema.prisma.
// The output path is custom: "../../generated/prisma" instead of the default
// "node_modules/.prisma/client" (configured in schema.prisma's generator output).
import { PrismaClient } from "../../generated/prisma";
// PrismaLibSQL — adapter that connects Prisma to Turso (serverless, edge-distributed SQLite)
// using the libSQL client library. Only used when TURSO_AUTH_TOKEN is set.
import { PrismaLibSQL } from "@prisma/adapter-libsql";
// env — validated environment variables (see ~/env.js for the validation schema)
import { env } from "~/env";

/**
 * Factory function that creates the appropriate PrismaClient instance
 * based on the runtime environment.
 *
 * With TURSO_AUTH_TOKEN → uses PrismaLibSQL adapter for Turso connection
 * Without                → uses plain PrismaClient for local SQLite file
 */
const createPrismaClient = () => {
  // TURSO_AUTH_TOKEN present → connect to Turso via libsql adapter
  if (env.TURSO_AUTH_TOKEN) {
    // PrismaLibSQL takes the same config as createClient() — it creates the
    // libsql connection internally. We don't call createClient() ourselves.
    const adapter = new PrismaLibSQL({
      url: env.DATABASE_URL,
      authToken: env.TURSO_AUTH_TOKEN,
    });

    return new PrismaClient({
      adapter,
      // In development, log all queries, errors, and warnings for debugging.
      // In production, only log errors to avoid spam.
      log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });
  }

  // No token → local SQLite (no adapter needed)
  return new PrismaClient({
    log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
};

/**
 * Global singleton pattern.
 * In development, Next.js hot-reloading creates new module instances. Without
 * this guard, each re-render would create a new PrismaClient, exhausting
 * database connections. We store the client on globalThis to persist it.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

// Use existing global client if available, otherwise create a new one
export const db = globalForPrisma.prisma ?? createPrismaClient();

// In non-production environments, store the client reference globally
// so it survives hot-reloads without creating new connections
if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
