import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

interface PostAuthor {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
}

interface PollOptionData {
  id: string;
  text: string;
  _count: { votes: number };
}

interface PollData {
  id: string;
  options: PollOptionData[];
  expiresAt: Date | null;
  userVotedOptionId: string | null;
}

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

export const postRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      content: z.string().min(1).max(280),
      imageUrl: z.string().optional(),
      gifUrl: z.string().optional(),
      pollOptions: z.array(z.string().min(1).max(50)).min(2).max(4).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.post.create({
        data: {
          content: input.content,
          imageUrl: input.imageUrl,
          gifUrl: input.gifUrl,
          authorId: ctx.session.user.id,
          ...(input.pollOptions && input.pollOptions.length >= 2
            ? {
                poll: {
                  create: {
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

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const post = await ctx.db.post.findUnique({
        where: { id: input.id },
        include: postInclude(userId),
      });
      if (!post) return null;

      let userVotedOptionId: string | null = null;
      if (post.poll) {
        const vote = await ctx.db.vote.findFirst({
          where: { userId, option: { pollId: post.poll.id } },
          select: { optionId: true },
        });
        userVotedOptionId = vote?.optionId ?? null;
      }

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
              options: post.poll.options.map((opt) => ({
                id: opt.id,
                text: opt.text,
                _count: { votes: opt._count.votes },
              })),
              userVotedOptionId,
            }
          : null,
      };
    }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const posts = await ctx.db.post.findMany({
      orderBy: { createdAt: "desc" },
      include: postInclude(userId),
    });

    return Promise.all(
      posts.map(async (post) => {
        let userVotedOptionId: string | null = null;
        if (post.poll) {
          const vote = await ctx.db.vote.findFirst({
            where: { userId, option: { pollId: post.poll.id } },
            select: { optionId: true },
          });
          userVotedOptionId = vote?.optionId ?? null;
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
                userVotedOptionId,
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
        if (post && post.authorId !== userId) {
          await ctx.db.notification.create({
            data: { type: "LIKE", recipientId: post.authorId, actorId: userId, postId },
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
            data: { type: "REPOST", recipientId: post.authorId, actorId: userId, postId },
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
          include: postInclude(userId),
        },
      },
    });

    return Promise.all(
      bookmarks.map(async (b) => {
        const post = b.post;
        let userVotedOptionId: string | null = null;
        if (post.poll) {
          const vote = await ctx.db.vote.findFirst({
            where: { userId, option: { pollId: post.poll.id } },
            select: { optionId: true },
          });
          userVotedOptionId = vote?.optionId ?? null;
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
                userVotedOptionId,
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
          options: {
            id: string;
            text: string;
            _count: { votes: number };
          }[];
        } | null;
      }): Promise<PostFeedItem> {
        let userVotedOptionId: string | null = null;
        if (post.poll) {
          const vote = await ctx.db.vote.findFirst({
            where: { userId: currentUserId, option: { pollId: post.poll.id } },
            select: { optionId: true },
          });
          userVotedOptionId = vote?.optionId ?? null;
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
                userVotedOptionId,
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
        const followedUsers = await ctx.db.follow.findMany({
          where: { followerId: currentUserId },
          select: { followingId: true },
        });
        const followedIds = followedUsers.map((f) => f.followingId);
        if (followedIds.length === 0) {
          return { items: [], nextCursor: undefined };
        }

        const directPosts = await ctx.db.post.findMany({
          where: { ...cursorWhere, authorId: { in: followedIds } },
          orderBy: { createdAt: "desc" },
          take: limit + 1,
          include: postInclude(currentUserId),
        });

        const repostsByFollowed = await ctx.db.repost.findMany({
          where: { ...cursorWhere, userId: { in: followedIds } },
          orderBy: { createdAt: "desc" },
          take: limit + 1,
          include: {
            post: { include: postInclude(currentUserId) },
            user: { select: { name: true, username: true } },
          },
        });

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

        items = [...directItems, ...repostItems].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      } else {
        const posts = await ctx.db.post.findMany({
          where: cursorWhere,
          orderBy: { createdAt: "desc" },
          take: limit + 1,
          include: postInclude(currentUserId),
        });
        items = await Promise.all(posts.map((p) => flatten(p)));
      }

      const hasMore = items.length > limit;
      const page = hasMore ? items.slice(0, limit) : items;
      const nextCursor = hasMore ? page[page.length - 1]!.createdAt.toISOString() : undefined;

      return { items: page, nextCursor };
    }),

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
          let userVotedOptionId: string | null = null;
          if (post.poll) {
            const vote = await ctx.db.vote.findFirst({
              where: { userId, option: { pollId: post.poll.id } },
              select: { optionId: true },
            });
            userVotedOptionId = vote?.optionId ?? null;
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
                  userVotedOptionId,
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

  searchAll: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      const q = input.query;
      const userId = ctx.session.user.id;
      const isUserSearch = q.startsWith("@");
      const term = isUserSearch ? q.slice(1) : q;

      if (isUserSearch) {
        const users = (await ctx.db.user.findMany({
          where: { username: { contains: term } },
          select: { id: true, name: true, username: true, image: true, bio: true },
          take: 20,
        })).filter((u) => u.id !== userId);
        return { users, posts: [] };
      }

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
            let userVotedOptionId: string | null = null;
            if (post.poll) {
              const vote = await ctx.db.vote.findFirst({
                where: { userId, option: { pollId: post.poll.id } },
                select: { optionId: true },
              });
              userVotedOptionId = vote?.optionId ?? null;
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
                    userVotedOptionId,
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
