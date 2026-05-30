/**
 * Post router — handles all post-related operations.
 *
 * Endpoints:
 * - create: Create a new post (max 280 chars, optional imageUrl)
 * - getById: Single post with interaction status and counts
 * - getAll: All posts (newest first) with interaction status
 * - toggleLike: Like/unlike toggle
 * - toggleBookmark: Bookmark/unbookmark toggle
 * - toggleRepost: Repost/undo repost toggle
 * - getBookmarkedPosts: Current user's bookmarked posts
 * - getFeed: Feed — all posts or only from followed users (with repost dedup)
 * - search: Full-text search on post content (case-insensitive contains, limit 50)
 * - getTrending: Top 5 hashtags from the past 7 days (regex-extracted from content)
 *
 * All endpoints require authentication.
 */

// Zod runtime validation library — provides schema-based input validation
import { z } from "zod";
// tRPC error class for throwing typed HTTP/gRPC-style errors (NOT_FOUND, FORBIDDEN, etc.)
import { TRPCError } from "@trpc/server";
// Router factory and the auth‑guarded procedure builder from the shared tRPC setup
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// Export a single router that groups all post-related procedures under the "post" namespace
export const postRouter = createTRPCRouter({
  // ── create ─────────────────────────────────────────────────────────────
  // Create a new post.  Requires content (1–280 chars) and accepts an
  // optional imageUrl.  The authenticated user is set as the author.
  create: protectedProcedure
    .input(z.object({ content: z.string().min(1).max(280), imageUrl: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      // Delegate to Prisma to persist the post
      return ctx.db.post.create({
        data: {
          content: input.content,
          imageUrl: input.imageUrl,
          authorId: ctx.session.user.id,
        },
      });
    }),

  // ── delete ─────────────────────────────────────────────────────────────
  // Delete a post by its ID.  Only the original author may delete it;
  // otherwise a FORBIDDEN error is thrown.
  delete: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch the post's authorId (minimal select) to check ownership
      const post = await ctx.db.post.findUnique({
        where: { id: input.postId },
        select: { authorId: true },
      });
      // If the post does not exist, return 404
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });
      // If the caller is not the author, reject with 403
      if (post.authorId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      // Safe to delete now
      await ctx.db.post.delete({ where: { id: input.postId } });
      return { success: true };
    }),

  // ── getById ────────────────────────────────────────────────────────────
  // Fetch a single post by its ID.  Includes the author profile, the
  // current user's interaction status (like / bookmark / repost), and
  // aggregate counts for likes, comments, and reposts.
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const post = await ctx.db.post.findUnique({
        where: { id: input.id },
        include: {
          // Author metadata shown on every post card
          author: {
            select: { id: true, name: true, username: true, image: true },
          },
          // Whether the current user has liked this post
          likes: {
            where: { userId: ctx.session.user.id },
            select: { userId: true },
          },
          // Whether the current user has bookmarked this post
          bookmarks: {
            where: { userId: ctx.session.user.id },
            select: { userId: true },
          },
          // Whether the current user has reposted this post
          reposts: {
            where: { userId: ctx.session.user.id },
            select: { userId: true },
          },
          // Aggregate counts used for the UI counters
          _count: {
            select: { likes: true, comments: true, reposts: true },
          },
        },
      });
      // Return null instead of throwing so the caller can render a 404 page
      if (!post) return null;
      // Flatten relational arrays into boolean flags and lift counts to top level
      return {
        ...post,
        likedByUser: post.likes.length > 0,
        bookmarkedByUser: post.bookmarks.length > 0,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        // Remove the raw arrays and _count so the response stays clean
        likes: undefined,
        bookmarks: undefined,
        _count: undefined,
      };
    }),

  // ── getAll ─────────────────────────────────────────────────────────────
  // Return every post newest-first, decorated with the current user's
  // interaction state and counts.
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const posts = await ctx.db.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: { id: true, name: true, username: true, image: true },
        },
        likes: {
          where: { userId: ctx.session.user.id },
          select: { userId: true },
        },
        bookmarks: {
          where: { userId: ctx.session.user.id },
          select: { userId: true },
        },
        reposts: {
          where: { userId: ctx.session.user.id },
          select: { userId: true },
        },
        _count: {
          select: { likes: true, comments: true, reposts: true },
        },
      },
    });

    // Map each raw Prisma result into the flattened shape the frontend expects
    return posts.map((post) => ({
      ...post,
      likedByUser: post.likes.length > 0,
      bookmarkedByUser: post.bookmarks.length > 0,
      repostedByUser: post.reposts.length > 0,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      repostCount: post._count.reposts,
      likes: undefined,
      bookmarks: undefined,
      reposts: undefined,
      _count: undefined,
      // getFeed sets this for reposted entries; getAll always returns null
      repostedBy: null,
    }));
  }),

  // ── toggleLike ─────────────────────────────────────────────────────────
  // Like or unlike a post (idempotent toggle).  When liking another user's
  // post, a LIKE notification is created for the post's author.
  toggleLike: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { postId } = input;
      const userId = ctx.session.user.id;

      // Check if the user already liked this post (compound unique key)
      const existingLike = await ctx.db.like.findUnique({
        where: {
          userId_postId: { userId, postId },
        },
      });

      if (existingLike) {
        // Unlike — remove the row and return the updated total
        await ctx.db.like.delete({
          where: { id: existingLike.id },
        });
        return { liked: false, count: await ctx.db.like.count({ where: { postId } }) };
      } else {
        // Like — first check who the post author is (to create a notification)
        const post = await ctx.db.post.findUnique({
          where: { id: postId },
          select: { authorId: true },
        });
        await ctx.db.like.create({
          data: { userId, postId },
        });
        // Notify the author only if the liker is a different person
        if (post && post.authorId !== userId) {
          await ctx.db.notification.create({
            data: {
              type: "LIKE",
              recipientId: post.authorId,
              actorId: userId,
              postId,
            },
          });
        }
        return { liked: true, count: await ctx.db.like.count({ where: { postId } }) };
      }
    }),

  // ── toggleBookmark ─────────────────────────────────────────────────────
  // Bookmark or unbookmark a post (idempotent toggle).
  toggleBookmark: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { postId } = input;
      const userId = ctx.session.user.id;

      // Look for an existing bookmark row
      const existingBookmark = await ctx.db.bookmark.findUnique({
        where: { userId_postId: { userId, postId } },
      });

      if (existingBookmark) {
        // Remove bookmark
        await ctx.db.bookmark.delete({ where: { id: existingBookmark.id } });
        return { bookmarked: false };
      } else {
        // Add bookmark
        await ctx.db.bookmark.create({ data: { userId, postId } });
        return { bookmarked: true };
      }
    }),

  // ── toggleRepost ───────────────────────────────────────────────────────
  // Repost or undo a repost (idempotent toggle).  When reposting another
  // user's post, a REPOST notification is created.
  toggleRepost: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { postId } = input;
      const userId = ctx.session.user.id;

      // Check for an existing repost
      const existingRepost = await ctx.db.repost.findUnique({
        where: { userId_postId: { userId, postId } },
      });

      if (existingRepost) {
        // Undo repost
        await ctx.db.repost.delete({ where: { id: existingRepost.id } });
        return { reposted: false, count: await ctx.db.repost.count({ where: { postId } }) };
      } else {
        // Create repost — fetch author for notification target
        const post = await ctx.db.post.findUnique({
          where: { id: postId },
          select: { authorId: true },
        });
        await ctx.db.repost.create({ data: { userId, postId } });
        // Notify the author (skip self-reposts)
        if (post && post.authorId !== userId) {
          await ctx.db.notification.create({
            data: {
              type: "REPOST",
              recipientId: post.authorId,
              actorId: userId,
              postId,
            },
          });
        }
        return { reposted: true, count: await ctx.db.repost.count({ where: { postId } }) };
      }
    }),

  // ── getBookmarkedPosts ─────────────────────────────────────────────────
  // Fetch every post the current user has bookmarked, newest-first.
  // Each result includes the user's interaction state (liked, reposted)
  // and the timestamp of when it was bookmarked (bookmarkedAt).
  getBookmarkedPosts: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const bookmarks = await ctx.db.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        post: {
          include: {
            author: { select: { id: true, name: true, username: true, image: true } },
            likes: { where: { userId }, select: { userId: true } },
            reposts: { where: { userId }, select: { userId: true } },
            _count: { select: { likes: true, comments: true, reposts: true } },
          },
        },
      },
    });

    // Flatten the nested structure so each item looks like a regular post
    // with an extra bookmarkedAt field
    return bookmarks.map((b) => ({
      ...b.post,
      likedByUser: b.post.likes.length > 0,
      bookmarkedByUser: true, // trivially true — these are bookmarked posts
      repostedByUser: b.post.reposts.length > 0,
      likeCount: b.post._count.likes,
      commentCount: b.post._count.comments,
      repostCount: b.post._count.reposts,
      bookmarkedAt: b.createdAt,
      // Drop raw relation arrays / _count
      likes: undefined,
      bookmarks: undefined,
      reposts: undefined,
      _count: undefined,
      repostedBy: null,
    }));
  }),

  // ── getFeed ────────────────────────────────────────────────────────────
  // Cursor-based paginated feed.  When onlyFollowing is true, returns both
  // direct posts from followed users and reposts by followed users (with
  // deduplication so the same post does not appear twice).
  // When false, returns all posts (the "For You" feed).
  getFeed: protectedProcedure
    .input(z.object({
      onlyFollowing: z.boolean().default(false),
      limit: z.number().min(1).max(50).default(10),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { onlyFollowing, limit, cursor } = input;
      const currentUserId = ctx.session.user.id;

      // Build the timestamp filter for cursor-based pagination
      const cursorWhere = cursor ? { createdAt: { lt: new Date(cursor) } } : {};
      // Shared include clause used for every post query
      const baseInclude = {
        author: { select: { id: true, name: true, username: true, image: true } },
        likes: { where: { userId: currentUserId }, select: { userId: true } },
        bookmarks: { where: { userId: currentUserId }, select: { userId: true } },
        reposts: { where: { userId: currentUserId }, select: { userId: true } },
        _count: { select: { likes: true, comments: true, reposts: true } },
      };

      // Helper that converts a raw Prisma post into the flattened shape
      // used by the frontend components
      function mapPost(post: any) {
        return {
          ...post,
          likedByUser: post.likes.length > 0,
          bookmarkedByUser: post.bookmarks.length > 0,
          repostedByUser: post.reposts.length > 0,
          likeCount: post._count.likes,
          commentCount: post._count.comments,
          repostCount: post._count.reposts,
          likes: undefined,
          bookmarks: undefined,
          reposts: undefined,
          _count: undefined,
          repostedBy: null,
        };
      }

      let items: any[];
      if (onlyFollowing) {
        // ── "Following" feed ───────────────────────────────────────────
        // 1. Fetch the list of users the current user follows
        const followedUsers = await ctx.db.follow.findMany({
          where: { followerId: currentUserId },
          select: { followingId: true },
        });
        const followedIds = followedUsers.map((f) => f.followingId);
        // If the user follows nobody, return early with an empty page
        if (followedIds.length === 0) {
          return { items: [], nextCursor: undefined };
        }

        // 2. Direct posts authored by followed users
        const directPosts = await ctx.db.post.findMany({
          where: { ...cursorWhere, authorId: { in: followedIds } },
          orderBy: { createdAt: "desc" },
          take: limit + 1,
          include: baseInclude,
        });

        // 3. Reposts made by followed users
        const repostsByFollowed = await ctx.db.repost.findMany({
          where: { ...cursorWhere, userId: { in: followedIds } },
          orderBy: { createdAt: "desc" },
          take: limit + 1,
          include: {
            post: { include: baseInclude },
            user: { select: { name: true, username: true } },
          },
        });

        // Deduplicate: if a post appears both as a direct post and as a
        // repost, keep only the direct version.  The first repost wins
        // when multiple followed users repost the same post.
        const directIds = new Set(directPosts.map((p) => p.id));
        const repostMap = new Map<string, (typeof repostsByFollowed)[0]>();
        for (const r of repostsByFollowed) {
          if (!directIds.has(r.post.id) && !repostMap.has(r.post.id)) {
            repostMap.set(r.post.id, r);
          }
        }

        // 4. Merge and sort by timestamp descending
        const repostEntries = Array.from(repostMap.values()).map((r) => ({
          ...mapPost(r.post),
          repostedBy: { name: r.user.name, username: r.user.username },
        }));

        items = [...directPosts.map(mapPost), ...repostEntries].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      } else {
        // ── "For You" feed ─────────────────────────────────────────────
        // All posts, no follow filter
        const posts = await ctx.db.post.findMany({
          where: cursorWhere,
          orderBy: { createdAt: "desc" },
          take: limit + 1,
          include: baseInclude,
        });
        items = posts.map(mapPost);
      }

      // Pagination: if we fetched (limit + 1) items, there are more pages
      const hasMore = items.length > limit;
      const page = hasMore ? items.slice(0, limit) : items;
      // The cursor is the ISO string of the last item's createdAt
      const nextCursor = hasMore ? page[page.length - 1].createdAt.toISOString() : undefined;

      return { items: page, nextCursor };
    }),

  // ── search ─────────────────────────────────────────────────────────────
  // Full-text search over post content (case-insensitive contains).
  // Returns up to 50 posts, each enriched with the current user's
  // interaction state.
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      const posts = await ctx.db.post.findMany({
        where: {
          content: { contains: input.query },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          author: { select: { id: true, name: true, username: true, image: true } },
          likes: { where: { userId: ctx.session.user.id }, select: { userId: true } },
          bookmarks: { where: { userId: ctx.session.user.id }, select: { userId: true } },
          reposts: { where: { userId: ctx.session.user.id }, select: { userId: true } },
          _count: { select: { likes: true, comments: true, reposts: true } },
        },
      });
      return posts.map((post) => ({
        ...post,
        likedByUser: post.likes.length > 0,
        bookmarkedByUser: post.bookmarks.length > 0,
        repostedByUser: post.reposts.length > 0,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        repostCount: post._count.reposts,
        likes: undefined,
        bookmarks: undefined,
        reposts: undefined,
        _count: undefined,
        repostedBy: null,
      }));
    }),

  // ── searchAll ──────────────────────────────────────────────────────────
  // Cross-entity search: when the query starts with "@", search for users
  // by username.  Otherwise search both users (by name or username) and
  // posts (by content) in parallel, returning results under `users` and
  // `posts` keys.
  searchAll: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      const q = input.query;
      const userId = ctx.session.user.id;
      const isUserSearch = q.startsWith("@");
      const term = isUserSearch ? q.slice(1) : q;

      // User-specific search — no post results
      if (isUserSearch) {
        const users = (await ctx.db.user.findMany({
          where: { username: { contains: term } },
          select: { id: true, name: true, username: true, image: true, bio: true },
          take: 20,
        })).filter((u) => u.id !== userId);
        return { users, posts: [] };
      }

      // General search — hit both tables simultaneously
      const [users, posts] = await Promise.all([
        (ctx.db.user.findMany({
          where: { OR: [{ name: { contains: term } }, { username: { contains: term } }] },
          select: { id: true, name: true, username: true, image: true, bio: true },
          take: 10,
        })).then((r) => r.filter((u) => u.id !== userId)),
        ctx.db.post.findMany({
          where: { content: { contains: term } },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            author: { select: { id: true, name: true, username: true, image: true } },
            likes: { where: { userId }, select: { userId: true } },
            bookmarks: { where: { userId }, select: { userId: true } },
            reposts: { where: { userId }, select: { userId: true } },
            _count: { select: { likes: true, comments: true, reposts: true } },
          },
        }),
      ]);

      return {
        users,
        posts: posts.map((post) => ({
          ...post,
          likedByUser: post.likes.length > 0,
          bookmarkedByUser: post.bookmarks.length > 0,
          repostedByUser: post.reposts.length > 0,
          likeCount: post._count.likes,
          commentCount: post._count.comments,
          repostCount: post._count.reposts,
          likes: undefined,
          bookmarks: undefined,
          reposts: undefined,
          _count: undefined,
          repostedBy: null,
        })),
      };
    }),

  // ── getTrending ────────────────────────────────────────────────────────
  // Compute the top 5 hashtags from posts created in the last 7 days.
  // Extracts #hashtag tokens via regex, counts case-insensitively, and
  // returns the most frequent entries.
  getTrending: protectedProcedure.query(async ({ ctx }) => {
    const recentPosts = await ctx.db.post.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      select: { content: true },
      take: 500,
    });
    const hashtagCount = new Map<string, number>();
    for (const post of recentPosts) {
      const tags = post.content.match(/#\w+/g);
      if (tags) {
        for (const tag of tags) {
          const key = tag.toLowerCase();
          hashtagCount.set(key, (hashtagCount.get(key) ?? 0) + 1);
        }
      }
    }
    // Sort descending by count, take top 5, map to { hashtag, count }
    return Array.from(hashtagCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hashtag, count]) => ({ hashtag, count }));
  }),
});
