/**
 * NextAuth API route handler.
 * Exports GET and POST handlers from the NextAuth configuration
 * for the catch-all route /api/auth/[...nextauth].
 * Handles sign-in, sign-out, session retrieval, and callbacks.
 */

// Import the handlers object that contains GET and POST request handlers
// These are created by NextAuth() in the auth module
import { handlers } from "~/server/auth";

// Destructure and re-export GET and POST so Next.js App Router
// can route HTTP requests at /api/auth/[...nextauth] to NextAuth
export const { GET, POST } = handlers;
