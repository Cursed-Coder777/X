/**
 * NextAuth configuration for the X Clone.
 *
 * Authentication strategy:
 * - Uses PrismaAdapter to persist sessions/users via the database
 * - Credentials provider: email + password login with bcrypt verification
 * - JWT session strategy (no database sessions)
 * - Custom JWT/session callbacks inject user id and username into the token
 *
 * The authorize function validates credentials with Zod,
 * looks up the user by email, and compares the hashed password.
 */

// Prisma adapter connects NextAuth to the database via Prisma ORM
import { PrismaAdapter } from "@auth/prisma-adapter";
// Credentials provider allows email+password login (as opposed to OAuth)
import Credentials from "next-auth/providers/credentials";
// bcrypt is used to hash and compare user passwords securely
import bcrypt from "bcrypt";
// db is the Prisma client singleton used for all database queries
import { db } from "~/server/db";
// Zod is used for runtime schema validation of login credentials
import { z } from "zod";
// NextAuthConfig is the TypeScript type for the configuration object
import type { NextAuthConfig } from "next-auth";

// Export the auth configuration object, satisfying the NextAuthConfig type
export const authConfig = {
  // Attach the Prisma adapter so NextAuth reads/writes users, sessions, etc. via Prisma
  adapter: PrismaAdapter(db),

  // --- PROVIDERS ---
  // List of authentication providers. Here we only use credentials (email + password).
  providers: [
    Credentials({
      // Display name shown on the default sign-in page
      name: "credentials",
      // Fields rendered on the sign-in form
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // authorize is called when the user submits the sign-in form
      async authorize(credentials) {
        // Validate that the input is a well-formed email and a password of at least 6 chars
        const parsed = z
          .object({
            email: z.string().email(),
            password: z.string().min(6),
          })
          .safeParse(credentials);
        // If validation fails, return null to reject authentication
        if (!parsed.success) return null;

        // Extract the validated email and password
        const { email, password } = parsed.data;
        // Look up the user by their email address
        const user = await db.user.findUnique({ where: { email } });
        // If the user doesn't exist or has no password (e.g. OAuth-only user), reject
        if (!user?.password) return null;

        // Compare the submitted password against the stored bcrypt hash
        const isValid = await bcrypt.compare(password, user.password);
        // If passwords don't match, reject
        if (!isValid) return null;

        // Return the user object (without the password) to create a session
        // The `id`, `username` fields are used by the JWT callback below
        return { id: user.id, email: user.email, name: user.name, image: user.image, username: user.username };
      },
    }),
  ],

  // --- SESSION STRATEGY ---
  // Use JWT strategy (no session records are stored in the database)
  session: { strategy: "jwt" },

  // --- CUSTOM PAGES ---
  // Override the default sign-in page URL
  pages: { signIn: "/auth/signin" },

  // --- SECRET ---
  // Secret used to sign JWTs. Falls back to AUTH_SECRET or NEXTAUTH_SECRET env variables.
  secret: process.env.AUTH_SECRET,

  // --- CALLBACKS ---
  // Custom logic that runs during authentication flows
  callbacks: {
    // jwt() runs every time a JWT is created or updated
    jwt({ token, user, trigger, session: updateData }) {
      // On initial sign-in (user is provided), copy user fields into the token
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.picture = user.image;
      }
      // On a session update trigger (e.g. after profile edit), merge updated fields
      if (trigger === "update" && updateData) {
        const data = updateData as { name?: string; image?: string; username?: string };
        if (data.name) token.name = data.name;
        if (data.image) token.picture = data.image;
        if (data.username) token.username = data.username;
      }
      return token;
    },
    // session() runs every time the session is read; it maps the JWT token back to the session object
    session({ session, token }) {
      if (session.user) {
        // Attach the user id and username from the token so they're available on the client
        session.user.id = token.id as string;
        session.user.username = token.username as string | undefined;
        session.user.image = token.picture;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
