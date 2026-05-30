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

// Zod runtime validation library — provides schema-based input validation
import { z } from "zod";
// Router factory, auth-guarded procedure, and public procedure from the shared tRPC setup
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
// tRPC error class for throwing typed errors (CONFLICT, NOT_FOUND, BAD_REQUEST)
import { TRPCError } from "@trpc/server";
// bcrypt for hashing passwords before storing them in the database
import bcrypt from "bcrypt";

// Export a single router that groups all user-related procedures under the "user" namespace
export const userRouter = createTRPCRouter({
  // ── signup ─────────────────────────────────────────────────────────────
  // Public (no auth required).  Creates a new user account.  Validates that
  // the email and username are unique — throws CONFLICT if either is taken.
  signup: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      username: z.string().min(3),
      password: z.string().min(6),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check for existing user with the same email or username
      const exists = await ctx.db.user.findFirst({
        where: { OR: [{ email: input.email }, { username: input.username }] },
      });
      if (exists) {
        throw new TRPCError({ code: "CONFLICT", message: "User already exists." });
      }
      // Hash the password with a salt round of 10
      const hashedPassword = await bcrypt.hash(input.password, 10);
      // Persist the new user
      const user = await ctx.db.user.create({
        data: {
          name: input.name,
          email: input.email,
          username: input.username,
          password: hashedPassword,
        },
      });
      // Return a safe subset — never expose the password hash
      return { id: user.id, email: user.email, username: user.username };
    }),

  // ── getByUsername ──────────────────────────────────────────────────────
  // Fetch a user's public profile by their unique username.  Includes
  // follower / following / post counts.  Throws NOT_FOUND if the username
  // does not exist.
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

  // ── isFollowing ────────────────────────────────────────────────────────
  // Check whether the current user follows a given target user.  Returns
  // a simple boolean { isFollowing }.
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

  // ── toggleFollow ───────────────────────────────────────────────────────
  // Follow or unfollow a user (idempotent toggle).  Prevents self-follow
  // with a BAD_REQUEST error.  When following, creates a FOLLOW notification
  // for the target user.
  toggleFollow: protectedProcedure
    .input(z.object({ targetUserId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { targetUserId } = input;
      const currentUserId = ctx.session.user.id;

      // Reject self-follow attempts
      if (currentUserId === targetUserId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot follow yourself" });
      }

      // Check for an existing follow relationship
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
        // Follow — create the relationship and a notification
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

  // ── getUserPosts ───────────────────────────────────────────────────────
  // Fetch a specific user's posts (newest first) for their profile page.
  // Each post includes the current user's like / bookmark state.
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
      // Flatten relational arrays into boolean flags and lift counts
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

  // ── updateProfile ──────────────────────────────────────────────────────
  // Update the current user's profile fields (name, bio, image, bannerUrl).
  // Only the authenticated user's own record can be modified.
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(50),
      bio: z.string().max(160).optional(),
      image: z.string().optional().nullable(),
      bannerUrl: z.string().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Spread only the fields that were actually provided so undefined
      // values do not accidentally clear existing data.
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

  // ── search ─────────────────────────────────────────────────────────────
  // Search users by name or username (case-insensitive contains).
  // Returns up to 10 results, excluding the current user.
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
      // Exclude the current user from results
      return users.filter((u) => u.id !== ctx.session.user.id);
    }),

  // ── getSuggestions ─────────────────────────────────────────────────────
  // "Who to Follow" widget: returns up to 3 users that the current user
  // is not already following.  Excludes the current user themselves.
  getSuggestions: protectedProcedure.query(async ({ ctx }) => {
    // Fetch all user IDs the current user follows
    const following = await ctx.db.follow.findMany({
      where: { followerId: ctx.session.user.id },
      select: { followingId: true },
    });
    const followingIds = new Set(following.map((f) => f.followingId));
    // Also exclude self
    followingIds.add(ctx.session.user.id);

    // Pick up to 3 random-ish users (no orderBy, so effectively arbitrary)
    const suggestions = await ctx.db.user.findMany({
      where: { id: { notIn: Array.from(followingIds) } },
      select: { id: true, name: true, username: true, image: true, bio: true },
      take: 3,
    });
    return suggestions;
  }),

  // ── getFollowers ───────────────────────────────────────────────────────
  // Return the list of users who follow the given user.
  getFollowers: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const followers = await ctx.db.follow.findMany({
        where: { followingId: input.userId },
        include: { follower: { select: { id: true, name: true, username: true, image: true } } },
      });
      // Unwrap the relation to return a flat array of user objects
      return followers.map((f) => f.follower);
    }),

  // ── getFollowing ───────────────────────────────────────────────────────
  // Return the list of users that the given user follows.
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
