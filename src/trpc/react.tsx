/**
 * Client-side tRPC and React Query provider.
 *
 * Sets up:
 * - Typed tRPC client (api) with httpBatchStreamLink for batching
 * - LoggerLink for debugging in development
 * - Singleton QueryClient on the client, fresh one on the server
 * - Exports RouterInputs/RouterOutputs type helpers
 *
 * The TRPCReactProvider component wraps the app with QueryClientProvider
 * and the tRPC Provider for useQuery/useMutation hooks.
 */

// Mark this module as a Client Component (runs in the browser)
"use client";

// React Query's provider and the QueryClient type
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
// tRPC client links — batching + streaming HTTP transport and dev logging
import { httpBatchStreamLink, loggerLink } from "@trpc/client";
// React integration — creates the typed api object and Provider
import { createTRPCReact } from "@trpc/react-query";
// Type helpers that infer input/output types from the AppRouter
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
// React hook for lazy-initializing the tRPC client
import { useState } from "react";
// SuperJSON handles serialization of Date, Map, Set across the wire
import SuperJSON from "superjson";

// The root AppRouter type — provides full end-to-end type safety
import { type AppRouter } from "~/server/api/root";
// Our custom QueryClient factory (with sensible defaults)
import { createQueryClient } from "./query-client";

// Singleton reference for the browser-side QueryClient so re-renders
// don't create a new client (and lose caches)
let clientQueryClientSingleton: QueryClient | undefined = undefined;

const getQueryClient = () => {
  if (typeof window === "undefined") {
    // On the server (SSR), always return a fresh QueryClient to avoid
    // sharing stale data between requests
    return createQueryClient();
  }
  // On the browser, reuse the same client across the app's lifetime
  clientQueryClientSingleton ??= createQueryClient();

  return clientQueryClientSingleton;
};

// The typed tRPC client object — all api.post.getAll(), api.user.signup()
// etc. are available with full type inference
export const api = createTRPCReact<AppRouter>();

/**
 * Inference helper for inputs.
 *
 * @example type HelloInput = RouterInputs['example']['hello']
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helper for outputs.
 *
 * @example type HelloOutput = RouterOutputs['example']['hello']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;

// Root provider that wraps the entire app with tRPC and React Query
export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  // useLazyRef pattern via useState — client is created once and frozen
  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        // LoggerLink: logs queries/mutations in dev or when there's an
        // error, useful for debugging
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        // httpBatchStreamLink: batches multiple requests into a single
        // HTTP call and streams the responses back
        httpBatchStreamLink({
          transformer: SuperJSON,
          url: getBaseUrl() + "/api/trpc",
          // Tag every request with a custom header for observability
          headers: () => {
            const headers = new Headers();
            headers.set("x-trpc-source", "nextjs-react");
            return headers;
          },
        }),
      ],
    }),
  );

  return (
    // React Query's context provider
    <QueryClientProvider client={queryClient}>
      {/* tRPC's React provider — enables useQuery / useMutation hooks */}
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
}

// Resolve the base URL for the tRPC endpoint depending on the runtime
// environment (browser, Vercel preview, local dev)
function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
