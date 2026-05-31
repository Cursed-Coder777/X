/**
 * Client-side providers wrapper.
 * Nesting order: SessionProvider (NextAuth) -> tRPC Provider -> QueryClientProvider.
 * Creates a QueryClient and tRPC client on first render using useState.
 * The httpBatchLink points to /api/trpc with SuperJSON transformer.
 */
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { SessionProvider } from "next-auth/react";
import { api } from "~/utils/api";
import { useState } from "react";
import ThemeProvider from "~/app/providers/ThemeProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
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
    <SessionProvider>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </QueryClientProvider>
      </api.Provider>
    </SessionProvider>
  );
}