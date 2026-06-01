/**
 * Client-side providers wrapper.
 *
 * Nesting order (outermost to innermost):
 *   SessionProvider (NextAuth) → tRPC Provider → QueryClientProvider → ThemeProvider
 *
 * Creates a QueryClient and tRPC client on first render using useState lazy
 * initialization. The httpBatchLink points to /api/trpc with SuperJSON
 * transformer for Date/Map/Set serialization support.
 */

"use client";

// React Query — server-state management with caching and background refetching
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// tRPC client link — httpBatchLink batches multiple tRPC calls into a single HTTP request
import { httpBatchLink } from "@trpc/client";
// SuperJSON — extended JSON serialization for Date, Map, Set, etc.
import superjson from "superjson";
// NextAuth's SessionProvider — provides the session context to all child components
import { SessionProvider } from "next-auth/react";
// Typed tRPC client object with full end-to-end type safety
import { api } from "~/utils/api";
// React hook for lazy initialization (creates client once per mount)
import { useState } from "react";
// Theme provider — manages dark/light mode with localStorage persistence
import ThemeProvider from "~/app/providers/ThemeProvider";

/**
 * Root providers component — wraps the entire app with all required contexts.
 * Must be used in the root layout (src/app/layout.tsx).
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  // Lazy-initialize React Query client (stable reference across re-renders)
  const [queryClient] = useState(() => new QueryClient());
  // Lazy-initialize tRPC client with HTTP batch link to /api/trpc
  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    // NextAuth session context — enables useSession() and api.auth.* hooks
    <SessionProvider>
      {/* tRPC React context — enables api.*.useQuery() / useMutation() hooks */}
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {/* React Query context — manages query caching and background updates */}
        <QueryClientProvider client={queryClient}>
          {/* Theme context — provides dark/light mode toggle across the app */}
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </QueryClientProvider>
      </api.Provider>
    </SessionProvider>
  );
}
