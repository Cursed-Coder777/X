/**
 * React Query client factory for the X Clone.
 *
 * Configures a QueryClient with sensible defaults:
 * - 30-second stale time to avoid unnecessary refetching after SSR hydration
 * - SuperJSON serialization/deserialization for tRPC compatibility
 * - Custom dehydrate logic that includes pending queries (not just settled ones)
 *
 * This factory is used by both:
 *   - src/trpc/react.tsx  (browser-side client, singleton per page lifecycle)
 *   - src/trpc/server.ts  (server-side for RSC prefetching, fresh per request)
 */

// defaultShouldDehydrateQuery — default filter that determines which queries
// are serialized during SSR for client hydration. We extend it to also
// include queries that are still in "pending" state.
import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
// SuperJSON — handles Date, Map, Set serialization so cached data types
// are preserved across SSR and client hydration
import SuperJSON from "superjson";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client.
        // 30 seconds gives the user time to interact before any
        // background refetch occurs.
        staleTime: 30 * 1000,
      },
      dehydrate: {
        // Use SuperJSON to serialize query data for SSR
        serializeData: SuperJSON.serialize,
        // Include queries in "pending" state in the dehydrated data
        // so the client shows the correct loading state
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        // Use SuperJSON to deserialize server-hydrated data on the client
        deserializeData: SuperJSON.deserialize,
      },
    },
  });
