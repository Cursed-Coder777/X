import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const pollRouter = createTRPCRouter({
  vote: protectedProcedure
    .input(z.object({
      pollId: z.string(),
      optionIds: z.array(z.string()).max(4),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const poll = await ctx.db.poll.findUnique({
        where: { id: input.pollId },
        include: { options: true },
      });
      if (!poll) throw new TRPCError({ code: "NOT_FOUND" });

      const validIds = new Set(poll.options.map((o) => o.id));
      for (const id of input.optionIds) {
        if (!validIds.has(id)) throw new TRPCError({ code: "BAD_REQUEST" });
      }
      if (input.optionIds.length > poll.maxVotes) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      await ctx.db.$transaction(async (tx) => {
        await tx.vote.deleteMany({
          where: { userId, option: { pollId: input.pollId } },
        });
        if (input.optionIds.length > 0) {
          await tx.vote.createMany({
            data: input.optionIds.map((optionId) => ({ optionId, userId })),
          });
        }
      });

      return { votedOptionIds: input.optionIds };
    }),
});
