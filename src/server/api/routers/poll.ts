import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const pollRouter = createTRPCRouter({
  vote: protectedProcedure
    .input(z.object({ optionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const option = await ctx.db.pollOption.findUnique({
        where: { id: input.optionId },
        include: { poll: { select: { id: true, postId: true } } },
      });
      if (!option) throw new TRPCError({ code: "NOT_FOUND" });

      const existing = await ctx.db.vote.findFirst({
        where: {
          userId,
          option: { pollId: option.pollId },
        },
        include: { option: { select: { id: true, text: true } } },
      });

      if (existing) {
        if (existing.optionId === input.optionId) {
          await ctx.db.vote.delete({ where: { id: existing.id } });
          return { votedOptionId: null };
        }
        await ctx.db.vote.delete({ where: { id: existing.id } });
      }

      await ctx.db.vote.create({ data: { optionId: input.optionId, userId } });
      return { votedOptionId: input.optionId };
    }),
});
