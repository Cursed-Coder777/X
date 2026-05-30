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
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
export const postRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ content: z.string().min(1).max(280), imageUrl: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.post.create({
        data: {
          content: input.content,
          imageUrl: input.imageUrl,
          authorId: ctx.session.user.id,
        },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const post = await ctx.db.post.findUnique({
        where: { id: input.id },
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
      if (!post) return null;
      return {
        ...post,
        likedByUser: post.likes.length > 0,
        bookmarkedByUser: post.bookmarks.length > 0,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        likes: undefined,
        bookmarks: undefined,
        _count: undefined,
      };
    }),

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

  toggleLike: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { postId } = input;
      const userId = ctx.session.user.id;

      const existingLike = await ctx.db.like.findUnique({
        where: {
          userId_postId: { userId, postId },
        },
      });

      if (existingLike) {
        await ctx.db.like.delete({
          where: { id: existingLike.id },
        });
        return { liked: false, count: await ctx.db.like.count({ where: { postId } }) };
      } else {
        const post = await ctx.db.post.findUnique({
          where: { id: postId },
          select: { authorId: true },
        });
        await ctx.db.like.create({
          data: { userId, postId },
        });
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
  toggleBookmark: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { postId } = input;
      const userId = ctx.session.user.id;

      const existingBookmark = await ctx.db.bookmark.findUnique({
        where: { userId_postId: { userId, postId } },
      });

      if (existingBookmark) {
        await ctx.db.bookmark.delete({ where: { id: existingBookmark.id } });
        return { bookmarked: false };
      } else {
        await ctx.db.bookmark.create({ data: { userId, postId } });
        return { bookmarked: true };
      }
    }),

  toggleRepost: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { postId } = input;
      const userId = ctx.session.user.id;

      const existingRepost = await ctx.db.repost.findUnique({
        where: { userId_postId: { userId, postId } },
      });

      if (existingRepost) {
        await ctx.db.repost.delete({ where: { id: existingRepost.id } });
        return { reposted: false, count: await ctx.db.repost.count({ where: { postId } }) };
      } else {
        const post = await ctx.db.post.findUnique({
          where: { id: postId },
          select: { authorId: true },
        });
        await ctx.db.repost.create({ data: { userId, postId } });
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

  getBookmarkedPosts: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const bookmarks = await ctx.db.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        post: {
          include: {
            author: { select: { name: true, username: true, image: true } },
            likes: { where: { userId }, select: { userId: true } },
            reposts: { where: { userId }, select: { userId: true } },
            _count: { select: { likes: true, comments: true, reposts: true } },
          },
        },
      },
    });

    return bookmarks.map((b) => ({
      ...b.post,
      likedByUser: b.post.likes.length > 0,
      bookmarkedByUser: true,
      repostedByUser: b.post.reposts.length > 0,
      likeCount: b.post._count.likes,
      commentCount: b.post._count.comments,
      repostCount: b.post._count.reposts,
      bookmarkedAt: b.createdAt,
      likes: undefined,
      bookmarks: undefined,
      reposts: undefined,
      _count: undefined,
      repostedBy: null,
    }));
  }),

  getFeed: protectedProcedure
    .input(z.object({ onlyFollowing: z.boolean().default(false) }))
    .query(async ({ ctx, input }) => {
      const { onlyFollowing } = input;
      const currentUserId = ctx.session.user.id;

      let posts;
      if (onlyFollowing) {
        const followedUsers = await ctx.db.follow.findMany({
          where: { followerId: currentUserId },
          select: { followingId: true },
        });
        const followedIds = followedUsers.map((f) => f.followingId);
        if (followedIds.length === 0) {
          return [];
        }

        // Get posts by followed users
        const directPosts = await ctx.db.post.findMany({
          where: { authorId: { in: followedIds } },
          orderBy: { createdAt: "desc" },
          include: {
            author: {
              select: { id: true, name: true, username: true, image: true },
            },
            likes: { where: { userId: currentUserId }, select: { userId: true } },
            bookmarks: { where: { userId: currentUserId }, select: { userId: true } },
            reposts: { where: { userId: currentUserId }, select: { userId: true } },
            _count: { select: { likes: true, comments: true, reposts: true } },
          },
        });

        // Get reposts by followed users (posts that were reposted by someone the current user follows)
        const repostsByFollowed = await ctx.db.repost.findMany({
          where: { userId: { in: followedIds } },
          orderBy: { createdAt: "desc" },
          include: {
            post: {
              include: {
                author: {
                  select: { id: true, name: true, username: true, image: true },
                },
                likes: { where: { userId: currentUserId }, select: { userId: true } },
                bookmarks: { where: { userId: currentUserId }, select: { userId: true } },
                reposts: { where: { userId: currentUserId }, select: { userId: true } },
                _count: { select: { likes: true, comments: true, reposts: true } },
              },
            },
            user: {
              select: { name: true, username: true },
            },
          },
        });

        // Deduplicate: if a post appears both as a direct post and a repost, keep the direct post.
        // If multiple reposts of the same post, keep the one with repostedBy.
        const directIds = new Set(directPosts.map((p) => p.id));
        const repostMap = new Map<string, (typeof repostsByFollowed)[0]>();

        for (const r of repostsByFollowed) {
          if (!directIds.has(r.post.id) && !repostMap.has(r.post.id)) {
            repostMap.set(r.post.id, r);
          }
        }

        const repostEntries = Array.from(repostMap.values()).map((r) => ({
          ...r.post,
          likedByUser: r.post.likes.length > 0,
          bookmarkedByUser: r.post.bookmarks.length > 0,
          repostedByUser: r.post.reposts.length > 0,
          likeCount: r.post._count.likes,
          commentCount: r.post._count.comments,
          repostCount: r.post._count.reposts,
          repostedBy: { name: r.user.name, username: r.user.username },
          likes: undefined,
          bookmarks: undefined,
          reposts: undefined,
          _count: undefined,
        }));

        const mappedDirect = directPosts.map((post) => ({
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

        // Merge and sort by createdAt descending
        posts = [...mappedDirect, ...repostEntries].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      } else {
        const allPosts = await ctx.db.post.findMany({
          orderBy: { createdAt: "desc" },
          include: {
            author: {
              select: { id: true, name: true, username: true, image: true },
            },
            likes: { where: { userId: currentUserId }, select: { userId: true } },
            bookmarks: { where: { userId: currentUserId }, select: { userId: true } },
            reposts: { where: { userId: currentUserId }, select: { userId: true } },
            _count: { select: { likes: true, comments: true, reposts: true } },
          },
        });
        posts = allPosts.map((post) => ({
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
      }
      return posts;
    }),

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
    return Array.from(hashtagCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hashtag, count]) => ({ hashtag, count }));
  }),
});
