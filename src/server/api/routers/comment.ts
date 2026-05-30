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

// Zod runtime validation library — provides schema-based input validation
import { z } from "zod";
// Router factory and auth-guarded procedure from the shared tRPC setup
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
// tRPC error class for throwing typed errors (FORBIDDEN)
import { TRPCError } from "@trpc/server";

// Export a single router that groups all comment-related procedures
export const commentRouter = createTRPCRouter({
  // ── getByPost ──────────────────────────────────────────────────────────
  // Fetch every comment on a given post, newest first.  Each comment
  // includes the author's basic profile info.
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

  // ── create ─────────────────────────────────────────────────────────────
  // Add a comment to a post.  When the commenter is not the post author, a
  // COMMENT notification is created for the post's author.
  create: protectedProcedure
    .input(z.object({ postId: z.string(), content: z.string().min(1).max(280) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      // Persist the comment and eager-load the author relation for the
      // frontend response
      const comment = await ctx.db.comment.create({
        data: {
          content: input.content,
          postId: input.postId,
          userId,
        },
        include: {
          user: {
            select: { id: true, name: true, username: true, image: true },
          },
        },
      });

      // Fetch the post author to determine notification target
      const post = await ctx.db.post.findUnique({
        where: { id: input.postId },
        select: { authorId: true },
      });
      // Notify only when the commenter is someone else
      if (post && post.authorId !== userId) {
        await ctx.db.notification.create({
          data: {
            type: "COMMENT",
            recipientId: post.authorId,
            actorId: userId,
            postId: input.postId,
            commentId: comment.id,
          },
        });
      }

      return comment;
    }),

  // ── delete ─────────────────────────────────────────────────────────────
  // Delete a comment.  Only the comment's author may delete it — anyone
  // else receives a FORBIDDEN error.
  delete: protectedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.comment.findUnique({
        where: { id: input.commentId },
      });
      // Ownership check: the comment's userId must match the session user
      if (comment?.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await ctx.db.comment.delete({ where: { id: input.commentId } });
      return { success: true };
    }),
});
