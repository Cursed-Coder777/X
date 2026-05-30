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
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { db } from "~/server/db";
import { z } from "zod";
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  adapter: PrismaAdapter(db),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = z
          .object({
            email: z.string().email(),
            password: z.string().min(6),
          })
          .safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await db.user.findUnique({ where: { email } });
        if (!user?.password) return null;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image, username: user.username };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/auth/signin" },
  secret: process.env.AUTH_SECRET,
  callbacks: {
    jwt({ token, user, trigger, session: updateData }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.picture = user.image;
      }
      if (trigger === "update" && updateData) {
        const data = updateData as { name?: string; image?: string; username?: string };
        if (data.name) token.name = data.name;
        if (data.image) token.picture = data.image;
        if (data.username) token.username = data.username;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string | undefined;
        session.user.image = token.picture;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
