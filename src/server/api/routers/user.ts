/**
 * User router — handles user accounts, profiles, and social interactions.
 *
 * Endpoints:
 * - signup (public): Register with name, email, username, password
 * - getByUsername: Profile with post/follower/following counts
 * - isFollowing: Check follow status
 * - toggleFollow: Follow/unfollow toggle (prevents self-follow)
 * - getUserPosts: User's posts for their profile page
 * - updateProfile: Update own name, bio, avatar image
 * - search: Search users by name or username (for DM new-message picker)
 * - getSuggestions: 3 users not yet followed by current user (for Who to Follow)
 * - getFollowers: List a user's followers
 * - getFollowing: List who a user follows
 *
 * Signup is public; all others require authentication.
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
          bannerUrl: true,
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
        await ctx.db.follow.delete({ where: { id: existing.id } });
        return { following: false };
      } else {
        await ctx.db.follow.create({
          data: { followerId: currentUserId, followingId: targetUserId },
        });
        await ctx.db.notification.create({
          data: {
            type: "FOLLOW",
            recipientId: targetUserId,
            actorId: currentUserId,
          },
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
          author: { select: { id: true, name: true, username: true, image: true } },
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

  // Update own profile (name, bio, image, bannerUrl)
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(50),
      bio: z.string().max(160).optional(),
      image: z.string().optional().nullable(),
      bannerUrl: z.string().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          name: input.name,
          ...(input.bio !== undefined ? { bio: input.bio } : {}),
          ...(input.image !== undefined ? { image: input.image } : {}),
          ...(input.bannerUrl !== undefined ? { bannerUrl: input.bannerUrl } : {}),
        },
      });
      return { id: user.id, name: user.name, bio: user.bio, image: user.image, bannerUrl: user.bannerUrl };
    }),

  search: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(50) }))
    .query(async ({ ctx, input }) => {
      const users = await ctx.db.user.findMany({
        where: {
          OR: [
            { name: { contains: input.query } },
            { username: { contains: input.query } },
          ],
        },
        select: { id: true, name: true, username: true, image: true },
        take: 10,
      });
      return users.filter((u) => u.id !== ctx.session.user.id);
    }),

  getSuggestions: protectedProcedure.query(async ({ ctx }) => {
    const following = await ctx.db.follow.findMany({
      where: { followerId: ctx.session.user.id },
      select: { followingId: true },
    });
    const followingIds = new Set(following.map((f) => f.followingId));
    followingIds.add(ctx.session.user.id);

    const suggestions = await ctx.db.user.findMany({
      where: { id: { notIn: Array.from(followingIds) } },
      select: { id: true, name: true, username: true, image: true, bio: true },
      take: 3,
    });
    return suggestions;
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