/**
 * Server-side tRPC caller for React Server Components.
 *
 * This module enables data fetching directly in Server Components without
 * making HTTP requests. It:
 * 1. Creates a per-request tRPC context (with session + db)
 * 2. Creates a per-request QueryClient for prefetching
 * 3. Wraps everything with createHydrationHelpers for RSC hydration
 *
 * Uses `server-only` to ensure this code is never accidentally imported
 * in client components (which would bundle server code and break security).
 */

// Enforce that this module is only imported in Server Components — it
// will fail at build time if a client module tries to import it.
// This is a security measure to prevent server-side code (database queries,
// session handling) from leaking to the browser bundle.
import "server-only";

// createHydrationHelpers — wraps the server caller into a shape compatible
// with RSC: returns a HydrateClient component for prefetching and an api
// object for calling procedures.
import { createHydrationHelpers } from "@trpc/react-query/rsc";
// headers — Next.js helper that reads the incoming request headers in
// Server Components (required to construct the tRPC context properly).
import { headers } from "next/headers";
// cache — React's cache() function memoizes the result of a function call
// per request, ensuring the context and QueryClient are created only once
// even when imported in multiple components on the same page.
import { cache } from "react";

// createCaller — wraps the AppRouter so it can be called programmatically
// (without an HTTP server). AppRouter type is used for type safety.
import { createCaller, type AppRouter } from "~/server/api/root";
// createTRPCContext — creates the tRPC context (db + session) for each request
import { createTRPCContext } from "~/server/api/trpc";
// Our custom QueryClient factory with SSR-friendly defaults
import { createQueryClient } from "./query-client";

/**
 * This wraps the `createTRPCContext` helper and provides the required context
 * for the tRPC API when handling a tRPC call from a React Server Component.
 *
 * cache() memoizes the result across the same render pass so that calling
 * api.post.getAll() in multiple places on the same page doesn't re-create
 * the context or re-fetch the session needlessly.
 */
const createContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set("x-trpc-source", "rsc");

  return createTRPCContext({
    headers: heads,
  });
});

// Also cache the QueryClient and the caller per request so they're shared
// across all components in the same render pass
const getQueryClient = cache(createQueryClient);
const caller = createCaller(createContext);

/**
 * Export the hydrated tRPC helpers:
 *
 *   api          — server caller object (e.g. await api.post.getAll())
 *                  Used to fetch data directly in Server Components
 *
 *   HydrateClient — React component that prefetches data via the server caller
 *                  and dehydrates it into the client-side React Query cache.
 *                  Wraps children with the dehydrated data so client components
 *                  can use api.*.useQuery() without an additional fetch.
 *
 * @example
 *   // In a Server Component page:
 *   const { data } = await api.post.getAll();
 *
 *   // Or with prefetching:
 *   <HydrateClient><MyClientComponent /></HydrateClient>
 */
export const { trpc: api, HydrateClient } = createHydrationHelpers<AppRouter>(
  caller,
  getQueryClient,
);
