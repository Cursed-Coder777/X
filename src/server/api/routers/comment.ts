/**
 * Comment router — handles comments/replies on posts.
 *
 * Endpoints:
 * - getByPost: Get all comments for a post (newest first)
 * - create: Add a comment to a post (max 280 chars)
 * - delete: Delete your own comment (ownership check, FORBIDDEN if not author)
 *
 * All endpoints require authentication.
 * Comments include the author's user info (id, name, username, image).
 */
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const commentRouter = createTRPCRouter({
  getByPost: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .query(async ({ ctx, input }) => {
      const comments = await ctx.db.comment.findMany({
        where: { postId: input.postId },
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, username: true, image: true },
          },
        },
      });
      return comments;
    }),

  create: protectedProcedure
    .input(z.object({ postId: z.string(), content: z.string().min(1).max(280) }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.comment.create({
        data: {
          content: input.content,
          postId: input.postId,
          userId: ctx.session.user.id,
        },
        include: {
          user: {
            select: { id: true, name: true, username: true, image: true },
          },
        },
      });
      return comment;
    }),

  delete: protectedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.comment.findUnique({
        where: { id: input.commentId },
      });
      if (comment?.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await ctx.db.comment.delete({ where: { id: input.commentId } });
      return { success: true };
    }),
});
