/**
 * NextAuth initialization.
 * Creates the auth instance from the configuration and exports
 * the request handlers (GET/POST for API routes), the auth()
 * helper for server-side session retrieval, and signIn/signOut
 * functions for programmatic authentication.
 */

// NextAuth is the core library that creates the authentication instance
import NextAuth from "next-auth";
// authConfig contains the provider, adapter, session, and callback configuration
import { authConfig } from "./config";

// Instantiate NextAuth with the configuration and destructure the four built-in exports:
//   handlers  – { GET, POST } for the catch-all API route
//   auth      – async helper that returns the current session on the server
//   signIn    – programmatic sign-in function (can be called from server actions)
//   signOut   – programmatic sign-out function
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
