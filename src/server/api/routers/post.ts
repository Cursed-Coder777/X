import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
export const postRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ content: z.string().min(1).max(280) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.post.create({
        data: {
          content: input.content,
          authorId: ctx.session.user.id,
        },
      });
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
        _count: {
          select: { likes: true },
        },
      },
    });

    // Transform to include `likedByUser` boolean and `likeCount`
    return posts.map((post) => ({
      ...post,
      likedByUser: post.likes.length > 0,
      likeCount: post._count.likes,
      likes: undefined,
      _count: undefined,
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
        // Unlike: delete the like
        await ctx.db.like.delete({
          where: { id: existingLike.id },
        });
        return { liked: false, count: await ctx.db.like.count({ where: { postId } }) };
      } else {
        // Like: create a new like
        await ctx.db.like.create({
          data: { userId, postId },
        });
        return { liked: true, count: await ctx.db.like.count({ where: { postId } }) };
      }
    }),
  getFeed: protectedProcedure
    .input(z.object({ onlyFollowing: z.boolean().default(false) }))
    .query(async ({ ctx, input }) => {
      const { onlyFollowing } = input;
      const currentUserId = ctx.session.user.id;

      let whereClause = {};
      if (onlyFollowing) {
        // Get IDs of users that current user follows
        const followedUsers = await ctx.db.follow.findMany({
          where: { followerId: currentUserId },
          select: { followingId: true },
        });
        const followedIds = followedUsers.map((f) => f.followingId);
        if (followedIds.length === 0) {
          return []; // No posts if not following anyone
        }
        whereClause = { authorId: { in: followedIds } };
      }

      const posts = await ctx.db.post.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: { id: true, name: true, username: true, image: true },
          },
          likes: { where: { userId: currentUserId }, select: { userId: true } },
          _count: { select: { likes: true } },
        },
      });

      return posts.map((post) => ({
        ...post,
        likedByUser: post.likes.length > 0,
        likeCount: post._count.likes,
        likes: undefined,
        _count: undefined,
      }));
    }),
});
