/**
 * NextAuth initialization module.
 *
 * This file creates the NextAuth instance using the configuration from
 * config.ts and exports the core authentication functions:
 *
 *   handlers  – { GET, POST } for the catch-all API route at /api/auth/[...nextauth]
 *   auth      – async helper that returns the current session (used in server components and API)
 *   signIn    – programmatic sign-in function (can be called from server actions)
 *   signOut   – programmatic sign-out function
 *
 * Usage in server components:
 *   import { auth } from "~/server/auth";
 *   const session = await auth();
 *
 * Usage in API route handlers:
 *   import { handlers } from "~/server/auth";
 *   export const { GET, POST } = handlers;
 */

// NextAuth — core library that creates the authentication instance.
// It accepts a configuration object and returns { handlers, auth, signIn, signOut }.
import NextAuth from "next-auth";
// authConfig — the configuration object defined in config.ts containing
// providers, adapter, session strategy, callbacks, and pages.
import { authConfig } from "./config";

// Instantiate NextAuth with the configuration and destructure the four
// built-in exports for use throughout the application.
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
