/**
 * NextAuth API route handler — catch-all route: /api/auth/[...nextauth]
 *
 * Exports GET and POST request handlers from the NextAuth configuration.
 * NextAuth internally handles:
 *   - Sign-in (POST /api/auth/callback/credentials)
 *   - Sign-out (POST /api/auth/signout)
 *   - Session retrieval (GET /api/auth/session)
 *   - CSRF token (GET /api/auth/csrf)
 *   - Provider callbacks
 *   - etc.
 *
 * The handlers object is created by NextAuth() in ~/server/auth/index.ts
 * using the configuration from ~/server/auth/config.ts.
 */

import { handlers } from "~/server/auth";

// Destructure and re-export GET and POST so Next.js App Router routes
// HTTP requests at /api/auth/[...nextauth] to NextAuth's handlers
export const { GET, POST } = handlers;
