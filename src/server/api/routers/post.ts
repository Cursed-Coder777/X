/**
 * Post router — core social media operations for creating, reading, updating,
 * and interacting with posts.
 *
 * Endpoints:
 *   create          — create a new post (280 chars max, optional image/GIF/poll)
 *   delete          — delete your own post (ownership check)
 *   getById         — fetch a single post with interaction state
 *   getAll          — fetch all posts (newest first) for the main feed
 *   toggleLike      — like/unlike a post (idempotent, creates notification)
 *   toggleBookmark  — bookmark/remove bookmark (idempotent)
 *   toggleRepost    — repost/unrepost a post (idempotent, creates notification)
 *   getBookmarkedPosts — fetch all posts bookmarked by the current user
 *   getFeed         — paginated feed with cursor-based infinite scroll
 *                    (supports "For You" and "Following" modes, includes reposts)
 *   search          — search posts by content text
 *   searchAll       — combined search (posts + users), supports @username prefix
 *   getTrending     — top 5 hashtags from the last 7 days
 *
 * All endpoints require authentication.
 * Returned posts include user interaction state (likedByUser, bookmarkedByUser, etc.)
 * and poll data with user's vote status where applicable.
 */

// Zod runtime validation library — provides schema-based input validation
import { z } from "zod";
// tRPC error class for throwing typed errors (NOT_FOUND, FORBIDDEN, BAD_REQUEST)
import { TRPCError } from "@trpc/server";
// Router factory and auth-guarded procedure from the shared tRPC setup
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// ── Type Definitions ───────────────────────────────────────────────────────────

/** Minimal author data included in every post response */
interface PostAuthor {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
}

/** Raw poll option data from Prisma with vote count */
interface PollOptionData {
  id: string;
  text: string;
  _count: { votes: number };
}

/** Processed poll data ready for the client */
interface PollData {
  id: string;
  options: PollOptionData[];
  expiresAt: Date | null;
  maxVotes: number;
  userVotedOptionIds: string[];
}

/** Complete post item shape returned by feed/list endpoints */
interface PostFeedItem {
  id: string;
  content: string;
  imageUrl: string | null;
  gifUrl: string | null;
  authorId: string;
  author: PostAuthor;
  createdAt: Date;
  updatedAt: Date;
  likedByUser: boolean;
  bookmarkedByUser: boolean;
  repostedByUser: boolean;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  repostedBy: { name: string | null; username: string | null } | null;
  poll: PollData | null;
}

// ── Helper Functions ───────────────────────────────────────────────────────────

/**
 * Creates a Prisma `include` object for post queries that eagerly loads:
 * - The author's public profile fields
 * - Whether the current user has liked, bookmarked, or reposted this post
 * - Counts of likes, comments, and reposts
 * - Poll data with options and their vote counts
 */
function postInclude(userId: string) {
  return {
    author: { select: { id: true, name: true, username: true, image: true } },
    likes: { where: { userId }, select: { userId: true } },
    bookmarks: { where: { userId }, select: { userId: true } },
    reposts: { where: { userId }, select: { userId: true } },
    _count: { select: { likes: true, comments: true, reposts: true } },
    poll: {
      include: {
        options: {
          include: { _count: { select: { votes: true } } },
        },
      },
    },
  };
}

// ── Router ─────────────────────────────────────────────────────────────────────

export const postRouter = createTRPCRouter({
  // ── create ───────────────────────────────────────────────────────────────
  // Create a new post (280 chars max). Optionally attach an image URL, a GIF URL,
  // and/or a poll (2–4 options, 1–4 max votes per user).
  create: protectedProcedure
    .input(z.object({
      content: z.string().min(1).max(280),
      imageUrl: z.string().optional(),
      gifUrl: z.string().optional(),
      pollOptions: z.array(z.string().min(1).max(50)).min(2).max(4).optional(),
      pollMaxVotes: z.number().int().min(1).max(4).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Create the post and optionally nest a poll with its options in the same query
      const post = await ctx.db.post.create({
        data: {
          content: input.content,
          imageUrl: input.imageUrl,
          gifUrl: input.gifUrl,
          authorId: ctx.session.user.id,
          // Only create a poll if pollOptions has at least 2 entries
          ...(input.pollOptions && input.pollOptions.length >= 2
            ? {
                poll: {
                  create: {
                    maxVotes: input.pollMaxVotes ?? 1,
                    options: {
                      create: input.pollOptions.map((text) => ({ text })),
                    },
                  },
                },
              }
            : {}),
        },
      });
      return post;
    }),

  // ── delete ───────────────────────────────────────────────────────────────
  // Delete a post. Only the post's author may delete it (FORBIDDEN otherwise).
  delete: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.post.findUnique({
        where: { id: input.postId },
        select: { authorId: true },
      });
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });
      if (post.authorId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await ctx.db.post.delete({ where: { id: input.postId } });
      return { success: true };
    }),

  // ── getById ──────────────────────────────────────────────────────────────
  // Fetch a single post by its ID. Returns null if not found.
  // Includes interaction state (liked, bookmarked) and poll vote status.
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const post = await ctx.db.post.findUnique({
        where: { id: input.id },
        include: postInclude(userId),
      });
      if (!post) return null;

      // Check which poll options the current user has voted for
      let userVotedOptionIds: string[] = [];
      if (post.poll) {
        const votes = await ctx.db.vote.findMany({
          where: { userId, option: { pollId: post.poll.id } },
          select: { optionId: true },
        });
        userVotedOptionIds = votes.map((v) => v.optionId);
      }

      // Flatten Prisma relations into simple boolean flags and counts
      return {
        ...post,
        likedByUser: post.likes.length > 0,
        bookmarkedByUser: post.bookmarks.length > 0,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        likes: undefined,
        bookmarks: undefined,
        _count: undefined,
        poll: post.poll
          ? {
              id: post.poll.id,
              expiresAt: post.poll.expiresAt,
              maxVotes: post.poll.maxVotes,
              options: post.poll.options.map((opt) => ({
                id: opt.id,
                text: opt.text,
                _count: { votes: opt._count.votes },
              })),
              userVotedOptionIds,
            }
          : null,
      };
    }),

  // ── getAll ───────────────────────────────────────────────────────────────
  // Fetch ALL posts newest-first for the full "For You" feed.
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const posts = await ctx.db.post.findMany({
      orderBy: { createdAt: "desc" },
      include: postInclude(userId),
    });

    return Promise.all(
      posts.map(async (post) => {
        let userVotedOptionIds: string[] = [];
        if (post.poll) {
          const votes = await ctx.db.vote.findMany({
            where: { userId, option: { pollId: post.poll.id } },
            select: { optionId: true },
          });
          userVotedOptionIds = votes.map((v) => v.optionId);
        }
        return {
          id: post.id,
          content: post.content,
          imageUrl: post.imageUrl,
          gifUrl: post.gifUrl,
          authorId: post.authorId,
          author: post.author,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          likedByUser: post.likes.length > 0,
          bookmarkedByUser: post.bookmarks.length > 0,
          repostedByUser: post.reposts.length > 0,
          likeCount: post._count.likes,
          commentCount: post._count.comments,
          repostCount: post._count.reposts,
          repostedBy: null,
          poll: post.poll
            ? {
                id: post.poll.id,
                expiresAt: post.poll.expiresAt,
                maxVotes: post.poll.maxVotes,
                userVotedOptionIds,
                options: post.poll.options.map((opt) => ({
                  id: opt.id,
                  text: opt.text,
                  _count: { votes: opt._count.votes },
                })),
              }
            : null,
        } satisfies PostFeedItem;
      }),
    );
  }),

  // ── toggleLike ───────────────────────────────────────────────────────────
  // Toggle like on a post. Creates or deletes the Like record. If liking
  // someone else's post, creates a LIKE notification for the post author.
  toggleLike: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { postId } = input;
      const userId = ctx.session.user.id;
      const existingLike = await ctx.db.like.findUnique({
        where: { userId_postId: { userId, postId } },
      });
      if (existingLike) {
        await ctx.db.like.delete({ where: { id: existingLike.id } });
        return { liked: false, count: await ctx.db.like.count({ where: { postId } }) };
      } else {
        const post = await ctx.db.post.findUnique({
          where: { id: postId },
          select: { authorId: true },
        });
        await ctx.db.like.create({ data: { userId, postId } });
        // Notify the post author unless they liked their own post
        if (post && post.authorId !== userId) {
          await ctx.db.notification.create({
            data: { type: "LIKE", recipientId: post.authorId, actorId: userId, postId },
          });
        }
        return { liked: true, count: await ctx.db.like.count({ where: { postId } }) };
      }
    }),

  // ── toggleBookmark ───────────────────────────────────────────────────────
  // Toggle bookmark on a post. Creates or deletes the Bookmark record.
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

  // ── toggleRepost ─────────────────────────────────────────────────────────
  // Toggle repost on a post. Creates or deletes the Repost record. If
  // reposting someone else's post, creates a REPOST notification.
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
            data: { type: "REPOST", recipientId: post.authorId, actorId: userId, postId },
          });
        }
        return { reposted: true, count: await ctx.db.repost.count({ where: { postId } }) };
      }
    }),

  // ── getBookmarkedPosts ───────────────────────────────────────────────────
  // Fetch all posts that the current user has bookmarked, newest first.
  getBookmarkedPosts: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const bookmarks = await ctx.db.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        post: {
          include: postInclude(userId),
        },
      },
    });

    return Promise.all(
      bookmarks.map(async (b) => {
        const post = b.post;
        let userVotedOptionIds: string[] = [];
        if (post.poll) {
          const votes = await ctx.db.vote.findMany({
            where: { userId, option: { pollId: post.poll.id } },
            select: { optionId: true },
          });
          userVotedOptionIds = votes.map((v) => v.optionId);
        }
        return {
          id: post.id,
          content: post.content,
          imageUrl: post.imageUrl,
          gifUrl: post.gifUrl,
          authorId: post.authorId,
          author: post.author,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          likedByUser: post.likes.length > 0,
          bookmarkedByUser: true,
          repostedByUser: post.reposts.length > 0,
          likeCount: post._count.likes,
          commentCount: post._count.comments,
          repostCount: post._count.reposts,
          repostedBy: null,
          bookmarkedAt: b.createdAt,
          poll: post.poll
            ? {
                id: post.poll.id,
                expiresAt: post.poll.expiresAt,
                maxVotes: post.poll.maxVotes,
                userVotedOptionIds,
                options: post.poll.options.map((opt) => ({
                  id: opt.id,
                  text: opt.text,
                  _count: { votes: opt._count.votes },
                })),
              }
            : null,
        };
      }),
    );
  }),

  // ── getFeed ──────────────────────────────────────────────────────────────
  // Cursor-based paginated feed. Supports two modes:
  //   onlyFollowing=false → all posts ("For You")
  //   onlyFollowing=true  → only posts/reposts from followed users ("Following")
  // Returns up to `limit` items per page. The `cursor` is an ISO datetime string.
  getFeed: protectedProcedure
    .input(z.object({
      onlyFollowing: z.boolean().default(false),
      limit: z.number().min(1).max(50).default(10),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { onlyFollowing, limit, cursor } = input;
      const currentUserId = ctx.session.user.id;
      const cursorWhere = cursor ? { createdAt: { lt: new Date(cursor) } } : {};

      // ── Helper: flatten a raw Prisma post into the PostFeedItem shape ──
      async function flatten(post: {
        id: string;
        content: string;
        imageUrl: string | null;
        gifUrl: string | null;
        authorId: string;
        author: PostAuthor;
        createdAt: Date;
        updatedAt: Date;
        likes: { userId: string }[];
        bookmarks: { userId: string }[];
        reposts: { userId: string }[];
        _count: { likes: number; comments: number; reposts: number };
        poll: {
          id: string;
          expiresAt: Date | null;
          maxVotes: number;
          options: {
            id: string;
            text: string;
            _count: { votes: number };
          }[];
        } | null;
      }): Promise<PostFeedItem> {
        let userVotedOptionIds: string[] = [];
        if (post.poll) {
          const votes = await ctx.db.vote.findMany({
            where: { userId: currentUserId, option: { pollId: post.poll.id } },
            select: { optionId: true },
          });
          userVotedOptionIds = votes.map((v) => v.optionId);
        }
        return {
          id: post.id,
          content: post.content,
          imageUrl: post.imageUrl,
          gifUrl: post.gifUrl,
          authorId: post.authorId,
          author: post.author,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          likedByUser: post.likes.length > 0,
          bookmarkedByUser: post.bookmarks.length > 0,
          repostedByUser: post.reposts.length > 0,
          likeCount: post._count.likes,
          commentCount: post._count.comments,
          repostCount: post._count.reposts,
          repostedBy: null,
          poll: post.poll
            ? {
                id: post.poll.id,
                expiresAt: post.poll.expiresAt,
                maxVotes: post.poll.maxVotes,
                userVotedOptionIds,
                options: post.poll.options.map((opt) => ({
                  id: opt.id,
                  text: opt.text,
                  _count: { votes: opt._count.votes },
                })),
              }
            : null,
        };
      }

      let items: PostFeedItem[];
      if (onlyFollowing) {
        // ── "Following" tab ──
        // Fetch followed user IDs, then get both direct posts and reposts
        const followedUsers = await ctx.db.follow.findMany({
          where: { followerId: currentUserId },
          select: { followingId: true },
        });
        const followedIds = followedUsers.map((f) => f.followingId);
        if (followedIds.length === 0) {
          return { items: [], nextCursor: undefined };
        }

        // Get direct posts from followed users
        const directPosts = await ctx.db.post.findMany({
          where: { ...cursorWhere, authorId: { in: followedIds } },
          orderBy: { createdAt: "desc" },
          take: limit + 1,
          include: postInclude(currentUserId),
        });

        // Get reposts by followed users (shows posts from non-followed users
        // that were reposted by someone the current user follows)
        const repostsByFollowed = await ctx.db.repost.findMany({
          where: { ...cursorWhere, userId: { in: followedIds } },
          orderBy: { createdAt: "desc" },
          take: limit + 1,
          include: {
            post: { include: postInclude(currentUserId) },
            user: { select: { name: true, username: true } },
          },
        });

        // Deduplicate: skip reposts of posts already in directPosts
        const directIds = new Set(directPosts.map((p) => p.id));
        const repostMap = new Map<string, (typeof repostsByFollowed)[0]>();
        for (const r of repostsByFollowed) {
          if (!directIds.has(r.post.id) && !repostMap.has(r.post.id)) {
            repostMap.set(r.post.id, r);
          }
        }

        const directItems = await Promise.all(
          directPosts.map((p) => flatten(p)),
        );
        const repostItems = await Promise.all(
          Array.from(repostMap.values()).map(async (r) => {
            const item = await flatten(r.post);
            item.repostedBy = { name: r.user.name, username: r.user.username };
            return item;
          }),
        );

        // Merge and sort by creation date (newest first)
        items = [...directItems, ...repostItems].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      } else {
        // ── "For You" tab ──
        const posts = await ctx.db.post.findMany({
          where: cursorWhere,
          orderBy: { createdAt: "desc" },
          take: limit + 1,
          include: postInclude(currentUserId),
        });
        items = await Promise.all(posts.map((p) => flatten(p)));
      }

      // Determine if there are more items and compute the next cursor
      const hasMore = items.length > limit;
      const page = hasMore ? items.slice(0, limit) : items;
      const nextCursor = hasMore ? page[page.length - 1]!.createdAt.toISOString() : undefined;

      return { items: page, nextCursor };
    }),

  // ── search ───────────────────────────────────────────────────────────────
  // Search posts by content text (substring match). Returns up to 50 results.
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const posts = await ctx.db.post.findMany({
        where: { content: { contains: input.query } },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: postInclude(userId),
      });
      return Promise.all(
        posts.map(async (post) => {
          let userVotedOptionIds: string[] = [];
          if (post.poll) {
            const votes = await ctx.db.vote.findMany({
              where: { userId, option: { pollId: post.poll.id } },
              select: { optionId: true },
            });
            userVotedOptionIds = votes.map((v) => v.optionId);
          }
          return {
            id: post.id,
            content: post.content,
            imageUrl: post.imageUrl,
            gifUrl: post.gifUrl,
            authorId: post.authorId,
            author: post.author,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            likedByUser: post.likes.length > 0,
            bookmarkedByUser: post.bookmarks.length > 0,
            repostedByUser: post.reposts.length > 0,
            likeCount: post._count.likes,
            commentCount: post._count.comments,
            repostCount: post._count.reposts,
            repostedBy: null,
            poll: post.poll
              ? {
                  id: post.poll.id,
                  expiresAt: post.poll.expiresAt,
                  maxVotes: post.poll.maxVotes,
                  userVotedOptionIds,
                  options: post.poll.options.map((opt) => ({
                    id: opt.id,
                    text: opt.text,
                    _count: { votes: opt._count.votes },
                  })),
                }
              : null,
          } satisfies PostFeedItem;
        }),
      );
    }),

  // ── searchAll ────────────────────────────────────────────────────────────
  // Combined search for both posts and users. If the query starts with "@",
  // only searches for users by username (excluding the @ prefix).
  // Otherwise searches both user names/usernames and post content.
  searchAll: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      const q = input.query;
      const userId = ctx.session.user.id;
      const isUserSearch = q.startsWith("@");
      const term = isUserSearch ? q.slice(1) : q;

      // @username search — only find users
      if (isUserSearch) {
        const users = (await ctx.db.user.findMany({
          where: { username: { contains: term } },
          select: { id: true, name: true, username: true, image: true, bio: true },
          take: 20,
        })).filter((u) => u.id !== userId);
        return { users, posts: [] };
      }

      // General search — find both users and posts
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
          include: postInclude(userId),
        }),
      ]);

      return {
        users,
        posts: await Promise.all(
          posts.map(async (post) => {
            let userVotedOptionIds: string[] = [];
            if (post.poll) {
              const votes = await ctx.db.vote.findMany({
                where: { userId, option: { pollId: post.poll.id } },
                select: { optionId: true },
              });
              userVotedOptionIds = votes.map((v) => v.optionId);
            }
            return {
              id: post.id,
              content: post.content,
              imageUrl: post.imageUrl,
              gifUrl: post.gifUrl,
              authorId: post.authorId,
              author: post.author,
              createdAt: post.createdAt,
              updatedAt: post.updatedAt,
              likedByUser: post.likes.length > 0,
              bookmarkedByUser: post.bookmarks.length > 0,
              repostedByUser: post.reposts.length > 0,
              likeCount: post._count.likes,
              commentCount: post._count.comments,
              repostCount: post._count.reposts,
              repostedBy: null,
              poll: post.poll
                ? {
                    id: post.poll.id,
                    expiresAt: post.poll.expiresAt,
                    maxVotes: post.poll.maxVotes,
                    userVotedOptionIds,
                    options: post.poll.options.map((opt) => ({
                      id: opt.id,
                      text: opt.text,
                      _count: { votes: opt._count.votes },
                    })),
                  }
                : null,
            } satisfies PostFeedItem;
          }),
        ),
      };
    }),

  // ── getTrending ──────────────────────────────────────────────────────────
  // Compute the top 5 trending hashtags from the last 7 days.
  // Scans up to 500 recent posts, extracts hashtags via regex (#word),
  // counts occurrences, and returns the top 5 sorted by frequency.
  getTrending: protectedProcedure.query(async ({ ctx }) => {
    // Fetch posts from the last 7 days
    const recentPosts = await ctx.db.post.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      select: { content: true },
      take: 500,
    });
    // Count hashtag occurrences
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
    // Sort by count descending and return top 5
    return Array.from(hashtagCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hashtag, count]) => ({ hashtag, count }));
  }),
});
