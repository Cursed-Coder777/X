/**
 * Client-side tRPC and React Query provider.
 *
 * This module configures and exports:
 * - `api` — the typed tRPC client object (e.g. api.post.getAll.useQuery())
 * - `TRPCReactProvider` — React component that wraps the app with both
 *   QueryClientProvider and tRPC Provider
 * - `RouterInputs` / `RouterOutputs` — type helpers for input/output inference
 *
 * The provider uses:
 * - httpBatchStreamLink for efficient HTTP batching + streaming
 * - LoggerLink for debugging in development
 * - Singleton QueryClient on the browser, fresh one per SSR request
 */

// Mark this module as a Client Component (runs in the browser).
// Required because we use React hooks (useState) and browser APIs.
"use client";

// React Query's provider component and the QueryClient type
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
// tRPC client links — httpBatchStreamLink batches multiple tRPC calls into
// a single HTTP request, and loggerLink logs operations for debugging
import { httpBatchStreamLink, loggerLink } from "@trpc/client";
// createTRPCReact — factory that creates a strongly-typed tRPC React client
// object with .useQuery(), .useMutation(), etc. for every procedure
import { createTRPCReact } from "@trpc/react-query";
// Type inference helpers — extract the input and output types from the
// AppRouter for type-safe usage
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
// React hook for lazy-initializing the tRPC client once per component mount
import { useState } from "react";
// SuperJSON — extended JSON serialization for Date, Map, Set, etc.
import SuperJSON from "superjson";

// The root AppRouter type — provides full end-to-end type safety.
// This is imported as a type only to avoid bundling server code on the client.
import { type AppRouter } from "~/server/api/root";
// Our custom QueryClient factory with sensible defaults (30s staleTime, etc.)
import { createQueryClient } from "./query-client";

// Singleton reference for the browser-side QueryClient so re-renders
// don't create a new client (and lose caches).
let clientQueryClientSingleton: QueryClient | undefined = undefined;

const getQueryClient = () => {
  if (typeof window === "undefined") {
    // On the server (SSR), always return a fresh QueryClient to avoid
    // sharing stale data between requests
    return createQueryClient();
  }
  // On the browser, reuse the same client across the app's lifetime.
  // This preserves the query cache when navigating between pages.
  clientQueryClientSingleton ??= createQueryClient();

  return clientQueryClientSingleton;
};

/**
 * The typed tRPC client object.
 *
 * Usage:
 *   api.post.getAll.useQuery(...)        — fetch data
 *   api.post.toggleLike.useMutation(...) — mutate data
 *
 * All procedures are fully type-inferred from the AppRouter.
 */
export const api = createTRPCReact<AppRouter>();

/**
 * Inference helper for tRPC procedure inputs.
 *
 * @example type CreatePostInput = RouterInputs['post']['create']
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helper for tRPC procedure outputs.
 *
 * @example type PostOutput = RouterOutputs['post']['getAll']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;

/**
 * Root provider that wraps the entire app with tRPC and React Query contexts.
 *
 * Must be placed in the root layout so all pages and components have access
 * to the `api` hooks.
 */
export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  // useState initializer — creates the tRPC client once and freezes it.
  // Even if the component re-renders, the client reference stays stable.
  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        // LoggerLink: logs all tRPC operations in development or when an
        // error occurs, useful for debugging query/mutation flow
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        // httpBatchStreamLink: combines multiple tRPC calls into a single
        // HTTP POST request and streams responses back as they're ready.
        // Uses SuperJSON for serialization and tags requests for observability.
        httpBatchStreamLink({
          transformer: SuperJSON,
          url: getBaseUrl() + "/api/trpc",
          // Tag every request with a custom header for observability/logging
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
    // React Query's context provider — enables useQuery, useMutation, etc.
    <QueryClientProvider client={queryClient}>
      {/* tRPC's React provider — enables api.*.useQuery / useMutation hooks */}
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
}

/**
 * Resolve the base URL for the tRPC HTTP endpoint depending on the runtime
 * environment (browser, Vercel preview, local dev).
 *
 * In the browser: use window.location.origin
 * On Vercel:      use the VERCEL_URL environment variable
 * Local dev:      use localhost:3000
 */
function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
