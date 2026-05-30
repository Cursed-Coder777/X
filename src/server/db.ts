/**
 * Prisma client singleton — Turso (libSQL) edition.
 *
 * Uses @prisma/adapter-libsql to connect to Turso, a serverless SQLite
 * database that works on Vercel (unlike regular SQLite which needs a
 * persistent filesystem).
 *
 * How it works:
 *   - @libsql/client creates a connection to Turso's distributed SQLite
 *   - @prisma/adapter-libsql wraps that so Prisma can talk to it
 *   - Prisma schema stays as "sqlite" because Turso IS SQLite, just hosted
 *
 * In dev, you can still use local SQLite by setting DATABASE_URL="file:./prisma/db.sqlite"
 * and omitting TURSO_AUTH_TOKEN.
 */
import { PrismaClient } from "../../generated/prisma";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { env } from "~/env";

const createPrismaClient = () => {
  const adapter = new PrismaLibSQL({
    url: env.DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });

  return new PrismaClient({
    adapter,
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
