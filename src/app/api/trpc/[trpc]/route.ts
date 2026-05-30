/**
 * tRPC HTTP API route handler.
 * Uses fetchRequestHandler from @trpc/server to process all tRPC requests
 * at /api/trpc/{path}. Creates context from the incoming request headers
 * and logs errors in development mode.
 * Handles both GET (queries) and POST (mutations) requests.
 */

// fetchRequestHandler is the adapter that connects tRPC to any fetch-based runtime (Next.js App Router)
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
// NextRequest is the typed request object from Next.js server components
import { type NextRequest } from "next/server";

// env provides validated environment variables (via t3-env)
import { env } from "~/env";
// appRouter is the root tRPC router that combines all sub-routers (posts, users, etc.)
import { appRouter } from "~/server/api/root";
// createTRPCContext builds the request-scoped context (session, db, headers) for every tRPC call
import { createTRPCContext } from "~/server/api/trpc";

/**
 * Wraps createTRPCContext so it receives only the request headers.
 * This context is passed to every tRPC procedure in the request.
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

// The unified handler for both GET (queries) and POST (mutations)
const handler = (req: NextRequest) =>
  fetchRequestHandler({
    // The base path for all tRPC endpoints
    endpoint: "/api/trpc",
    // The incoming fetch request
    req,
    // The root router that resolves `req.url` to a procedure
    router: appRouter,
    // Build the request-scoped context
    createContext: () => createContext(req),
    // Error logging — only log details in development mode
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
            );
          }
        : undefined,
  });

// Export the same handler for both GET and POST HTTP methods
export { handler as GET, handler as POST };
