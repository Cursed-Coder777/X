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

        return { id: user.id, email: user.email, name: user.name, username: user.username };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/auth/signin" },
  secret: process.env.AUTH_SECRET,
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
