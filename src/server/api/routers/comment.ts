/**
 * Comment router — handles comments/replies on posts.
 *
 * Endpoints:
 * - getByPost: Get all comments for a post as a tree (top-level + nested replies)
 * - create: Add a comment or reply (max 280 chars, optional parentId)
 * - delete: Delete your own comment (ownership check, FORBIDDEN if not author)
 *
 * All endpoints require authentication.
 * Comments include the author's user info (id, name, username, image).
 * Threaded replies are limited to 2 levels (top-level comment → reply).
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

// Type for a comment with nested replies
interface CommentWithReplies {
  id: string;
  content: string;
  userId: string;
  postId: string;
  parentId: string | null;
  createdAt: Date;
  user: { id: string; name: string | null; username: string | null; image: string | null };
  replies: CommentWithReplies[];
}

export const commentRouter = createTRPCRouter({
  // ── getByPost ──────────────────────────────────────────────────────────
  // Fetch all comments for a post and return as a tree structure.
  // Top-level comments (parentId === null) are sorted newest-first.
  // Nested replies are sorted oldest-first (like X).
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

      // Build tree: separate top-level from replies, then nest
      const topLevel: CommentWithReplies[] = [];
      const replyMap = new Map<string, CommentWithReplies[]>();

      for (const comment of comments) {
        const node: CommentWithReplies = { ...comment, replies: [] };
        if (comment.parentId === null) {
          topLevel.push(node);
        } else {
          const existing = replyMap.get(comment.parentId) ?? [];
          existing.push(node);
          replyMap.set(comment.parentId, existing);
        }
      }

      // Attach replies to their parents (oldest first for replies)
      for (const parent of topLevel) {
        const replies = replyMap.get(parent.id);
        if (replies) {
          parent.replies = replies.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        }
      }

      return topLevel;
    }),

  // ── create ─────────────────────────────────────────────────────────────
  // Add a comment or reply to a post. When replying to a comment (parentId
  // provided), the parent must exist, belong to the same post, and be a
  // top-level comment (no nested replies beyond 2 levels).
  // Notifications go to the post author (top-level) or comment author (reply).
  create: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        content: z.string().min(1).max(280),
        parentId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Validate parentId if provided
      if (input.parentId) {
        const parentComment = await ctx.db.comment.findUnique({
          where: { id: input.parentId },
          select: { id: true, postId: true, parentId: true, userId: true },
        });

        if (!parentComment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Parent comment not found" });
        }
        if (parentComment.postId !== input.postId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Parent comment does not belong to this post" });
        }
        // Only allow 2 levels: parent must be a top-level comment (parentId === null)
        if (parentComment.parentId !== null) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot reply to a reply" });
        }
      }

      const comment = await ctx.db.comment.create({
        data: {
          content: input.content,
          postId: input.postId,
          userId,
          parentId: input.parentId ?? null,
        },
        include: {
          user: {
            select: { id: true, name: true, username: true, image: true },
          },
        },
      });

      // Create notification
      if (input.parentId) {
        // Reply to a comment → notify the comment author
        const parentComment = await ctx.db.comment.findUnique({
          where: { id: input.parentId },
          select: { userId: true },
        });
        if (parentComment && parentComment.userId !== userId) {
          await ctx.db.notification.create({
            data: {
              type: "COMMENT",
              recipientId: parentComment.userId,
              actorId: userId,
              postId: input.postId,
              commentId: comment.id,
            },
          });
        }
      } else {
        // Top-level comment → notify the post author
        const post = await ctx.db.post.findUnique({
          where: { id: input.postId },
          select: { authorId: true },
        });
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
      }

      return comment;
    }),

  // ── delete ─────────────────────────────────────────────────────────────
  // Delete a comment and its replies. Only the comment's author may delete it.
  delete: protectedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.comment.findUnique({
        where: { id: input.commentId },
        select: { userId: true, postId: true },
      });

      if (!comment) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (comment.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Delete replies first (children), then the comment itself
      await ctx.db.comment.deleteMany({
        where: { parentId: input.commentId },
      });
      await ctx.db.comment.delete({
        where: { id: input.commentId },
      });

      return { success: true };
    }),
});
