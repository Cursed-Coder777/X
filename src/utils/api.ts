/**
 * tRPC client utility.
 * Creates a typed tRPC React client using the AppRouter type,
 * providing full type safety for all queries and mutations
 * throughout the client application.
 */
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "~/server/api/root";

export const api = createTRPCReact<AppRouter>();