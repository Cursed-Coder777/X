/**
 * tRPC server core setup.
 *
 * This file bootstraps the tRPC API:
 * 1. CONTEXT: Creates the request context including database and auth session
 * 2. INITIALIZATION: Sets up the tRPC instance with SuperJSON transformer and
 *    Zod error formatting for structured validation error output
 * 3. PROCEDURES: Defines publicProcedure (no auth required) and
 *    protectedProcedure (auth required with automatic UNAUTHORIZED error)
 *
 * The timingMiddleware adds artificial latency in development to simulate
 * production network delays and logs execution time for each procedure call.
 */

// initTRPC — factory function that creates a new tRPC instance.
// TRPCError — error class used to throw standardized tRPC errors (UNAUTHORIZED,
// NOT_FOUND, etc.) that are automatically serialized and sent to the client.
import { initTRPC, TRPCError } from "@trpc/server";
// SuperJSON — extends JSON serialization to handle Date, Map, Set, BigInt, etc.
// so complex types survive the network round-trip without data loss or manual
// transformation.
import superjson from "superjson";
// ZodError — used in the errorFormatter to extract and surface Zod validation
// errors in a structured format the frontend can display field-level messages.
import { ZodError } from "zod";

// auth — NextAuth helper that reads the current user's session from the
// request cookie and returns the session object (or null if not authenticated).
import { auth } from "~/server/auth";
// db — Prisma client singleton, provides access to all database models.
import { db } from "~/server/db";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the
 * database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler
 * and RSC clients each wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  // Resolve the NextAuth session for every request. If the user is logged in,
  // session.user will contain their id, name, email, etc.
  const session = await auth();

  return {
    db,          // Prisma client — accessible as ctx.db in every procedure
    session,     // NextAuth session object — accessible as ctx.session
    ...opts,     // Spread incoming options (headers, etc.)
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and
 * transformer. We also parse ZodErrors so that you get typesafety on the
 * frontend if your procedure fails due to validation errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  // SuperJSON handles serialization of complex types (Date, Map, Set)
  // so they survive the network round-trip
  transformer: superjson,
  // Custom error formatter that extracts Zod validation errors into a
  // structured shape the frontend can use for field-level error display
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller factory.
 * Used by src/trpc/server.ts to create typed callers for RSC.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import
 * these a lot in the "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay
 * in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted
 * waterfalls by simulating network latency that would occur in production
 * but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // Add a random delay between 100–500 ms in development to mimic real
    // network conditions and surface latent waterfall issues early
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  // Log procedure execution time for debugging
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your
 * tRPC API. It does not guarantee that a user querying is authorized, but
 * you can still access user session data if they are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users,
 * use this. It verifies the session is valid and guarantees
 * `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        // Narrow the type so downstream procedures see session.user as
        // non-nullable, avoiding repeated null checks
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });
