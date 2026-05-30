/**
 * User router — handles user accounts, profiles, and social interactions.
 *
 * Endpoints:
 * - signup (public): Register a new user with name, email, username, password
 * - getByUsername: Get user profile data (post/follower/following counts)
 * - isFollowing: Check if current user follows a target user
 * - toggleFollow: Follow or unfollow a user (toggle, prevents self-follow)
 * - getUserPosts: Get a user's posts for their profile page
 * - getFollowers: List users who follow a given user
 * - getFollowing: List users a given user follows
 *
 * Signup is public; all other endpoints require authentication.
 * Passwords are hashed with bcrypt. Duplicate email/username returns CONFLICT.
 */
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcrypt";

export const userRouter = createTRPCRouter({
  signup: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      username: z.string().min(3),
      password: z.string().min(6),
    }))
    .mutation(async ({ ctx, input }) => {
      const exists = await ctx.db.user.findFirst({
        where: { OR: [{ email: input.email }, { username: input.username }] },
      });
      if (exists) {
        throw new TRPCError({ code: "CONFLICT", message: "User already exists." });
      }
      const hashedPassword = await bcrypt.hash(input.password, 10);
      const user = await ctx.db.user.create({
        data: {
          name: input.name,
          email: input.email,
          username: input.username,
          password: hashedPassword,
        },
      });
      return { id: user.id, email: user.email, username: user.username };
    }),

  // Get user by username (for profile page)
  getByUsername: protectedProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { username: input.username },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          image: true,
          bio: true,
          createdAt: true,
          _count: {
            select: { followers: true, following: true, posts: true },
          },
        },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      return user;
    }),

  // Check if current user follows a target user
  isFollowing: protectedProcedure
    .input(z.object({ targetUserId: z.string() }))
    .query(async ({ ctx, input }) => {
      const follow = await ctx.db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: ctx.session.user.id,
            followingId: input.targetUserId,
          },
        },
      });
      return { isFollowing: !!follow };
    }),

  // Toggle follow/unfollow
  toggleFollow: protectedProcedure
    .input(z.object({ targetUserId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { targetUserId } = input;
      const currentUserId = ctx.session.user.id;

      if (currentUserId === targetUserId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot follow yourself" });
      }

      const existing = await ctx.db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: targetUserId,
          },
        },
      });

      if (existing) {
        // Unfollow
        await ctx.db.follow.delete({ where: { id: existing.id } });
        return { following: false };
      } else {
        // Follow
        await ctx.db.follow.create({
          data: { followerId: currentUserId, followingId: targetUserId },
        });
        return { following: true };
      }
    }),

  // Get user's posts (for profile page)
  getUserPosts: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const posts = await ctx.db.post.findMany({
        where: { authorId: input.userId },
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { name: true, username: true, image: true } },
          likes: { where: { userId: ctx.session.user.id }, select: { userId: true } },
          bookmarks: { where: { userId: ctx.session.user.id }, select: { userId: true } },
          _count: { select: { likes: true, comments: true } },
        },
      });
      return posts.map((post) => ({
        ...post,
        likedByUser: post.likes.length > 0,
        bookmarkedByUser: post.bookmarks.length > 0,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        likes: undefined,
        bookmarks: undefined,
        _count: undefined,
      }));
    }),

  // Get follower/following lists (optional)
  getFollowers: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const followers = await ctx.db.follow.findMany({
        where: { followingId: input.userId },
        include: { follower: { select: { id: true, name: true, username: true, image: true } } },
      });
      return followers.map((f) => f.follower);
    }),

  getFollowing: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const following = await ctx.db.follow.findMany({
        where: { followerId: input.userId },
        include: { following: { select: { id: true, name: true, username: true, image: true } } },
      });
      return following.map((f) => f.following);
    }),
});