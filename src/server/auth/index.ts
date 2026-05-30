/**
 * NextAuth initialization.
 * Creates the auth instance from the configuration and exports
 * the request handlers (GET/POST for API routes), the auth()
 * helper for server-side session retrieval, and signIn/signOut
 * functions for programmatic authentication.
 */
import NextAuth from "next-auth";
import { authConfig } from "./config";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);