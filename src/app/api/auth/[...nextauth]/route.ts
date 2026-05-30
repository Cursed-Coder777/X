/**
 * NextAuth API route handler.
 * Exports GET and POST handlers from the NextAuth configuration
 * for the catch-all route /api/auth/[...nextauth].
 * Handles sign-in, sign-out, session retrieval, and callbacks.
 */
import { handlers } from "~/server/auth";

export const { GET, POST } = handlers;
