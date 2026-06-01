/**
 * tRPC client utility.
 *
 * Creates a strongly-typed tRPC React client using the AppRouter type.
 * This provides full end-to-end type safety for all queries and mutations.
 *
 * Usage in client components:
 *   import { api } from "~/utils/api";
 *
 *   // Queries
 *   const { data } = api.post.getAll.useQuery({ limit: 10 });
 *
 *   // Mutations
 *   const mutation = api.post.create.useMutation();
 *
 * Note: For Server Components, use ~/trpc/server instead which provides
 * a server-side caller that works without HTTP requests.
 */
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "~/server/api/root";

// The typed tRPC client — all router procedures are available with
// full input/output type inference
export const api = createTRPCReact<AppRouter>();
