import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcrypt";
import { db } from "~/server/db";

export const userRouter = createTRPCRouter({
  // Registration mutation
  signup: publicProcedure
    .input(
      z.object({
        name: z.string().min(2),
        email: z.string().email(),
        username: z.string().min(3),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      const { name, email, username, password } = input;

      // Check existing user
      const existingEmail = await db.user.findUnique({ where: { email } });
      if (existingEmail) {
        throw new TRPCError({ code: "CONFLICT", message: "Email already exists" });
      }
      const existingUsername = await db.user.findUnique({ where: { username } });
      if (existingUsername) {
        throw new TRPCError({ code: "CONFLICT", message: "Username already taken" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await db.user.create({
        data: {
          name,
          email,
          username,
          password: hashedPassword,
        },
      });

      // Return user without password
      return { id: user.id, name: user.name, email: user.email, username: user.username };
    }),
});