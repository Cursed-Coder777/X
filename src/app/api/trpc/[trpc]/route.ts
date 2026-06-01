/**
 * tRPC HTTP API route handler — serves the entire tRPC API at /api/trpc/{path}.
 *
 * Uses fetchRequestHandler from @trpc/server to bridge the fetch-based
 * Next.js App Router with tRPC's request/response lifecycle.
 *
 * This single handler processes:
 *   - GET requests  → tRPC queries (data fetching)
 *   - POST requests → tRPC mutations (data modifications)
 *
 * Flow:
 *   1. Build request-scoped context (session, db, headers)
 *   2. Pass the incoming request to the tRPC fetch adapter
 *   3. The adapter resolves the URL to a procedure in appRouter
 *   4. The procedure runs with the context, returning data or throwing errors
 *   5. Errors are logged in development mode
 */

// fetchRequestHandler — tRPC adapter for fetch-based runtimes (Next.js App Router, Cloudflare, etc.)
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
// NextRequest — typed request object from Next.js server functions
import { type NextRequest } from "next/server";

// Environment variables (validated at startup by ~/env.js)
import { env } from "~/env";
// Root tRPC router — merges all sub-routers (post, user, comment, etc.)
import { appRouter } from "~/server/api/root";
// Context factory — provides db + session for every tRPC procedure
import { createTRPCContext } from "~/server/api/trpc";

/**
 * Wraps createTRPCContext so it receives only the request headers.
 * This context is passed to every tRPC procedure in the request pipeline.
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

// Unified handler for both GET and POST
const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",        // Base path for all tRPC endpoints
    req,                          // The incoming fetch request
    router: appRouter,            // The root router that resolves procedures
    createContext: () => createContext(req),  // Build request-scoped context
    // Error logging — only verbose in development mode
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(`❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`);
          }
        : undefined,
  });

// Export the same handler for both HTTP methods
export { handler as GET, handler as POST };
