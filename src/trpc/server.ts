/**
 * Server-side tRPC caller for React Server Components.
 *
 * Uses `server-only` to ensure this code never runs on the client.
 * Caches the context and query client per request using React's cache().
 * Exports `api` for RSC queries and `HydrateClient` for prefetching data
 * during SSR and hydrating it on the client.
 */

// Enforce that this module is only imported in Server Components — it
// will fail at build time if a client module tries to import it
import "server-only";

// Helpers that wrap the server caller into a shape compatible with
// React Server Components and hydration
import { createHydrationHelpers } from "@trpc/react-query/rsc";
// Next.js header helpers — required for reading request headers in RSC
import { headers } from "next/headers";
// React cache function — ensures the context and query client are
// created only once per request even when imported in multiple places
import { cache } from "react";

// The root AppRouter type and its server-side caller factory
import { createCaller, type AppRouter } from "~/server/api/root";
// The tRPC context factory — provides db + session for every procedure
import { createTRPCContext } from "~/server/api/trpc";
// Our custom QueryClient factory (identical to the one used on the client)
import { createQueryClient } from "./query-client";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
// cache() memoizes the result across the same render pass so that
// calling api.post.getAll() in multiple places doesn't re-create the
// context or re-fetch the session needlessly
const createContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set("x-trpc-source", "rsc");

  return createTRPCContext({
    headers: heads,
  });
});

// Also cache the QueryClient and the caller per request
const getQueryClient = cache(createQueryClient);
const caller = createCaller(createContext);

// Export the hydrated tRPC helpers:
//   api       — server caller (e.g. await api.post.getAll())
//   HydrateClient — component that dehydrates prefetched data into the
//   client-side React Query cache
export const { trpc: api, HydrateClient } = createHydrationHelpers<AppRouter>(
  caller,
  getQueryClient,
);
