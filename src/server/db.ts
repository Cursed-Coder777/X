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
 */
import { PrismaClient } from "../../generated/prisma";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { env } from "~/env";

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
      log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });
  }

  // No token → local SQLite (no adapter needed)
  return new PrismaClient({
    log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
