/**
 * Poll router — handles poll voting operations.
 *
 * Endpoints:
 *   vote — cast or change votes on a poll (max votes determined by poll.maxVotes)
 *
 * Voting logic:
 *   - Existing votes for the user are deleted first (allowing vote changes)
 *   - Then new votes are created for the selected optionIds
 *   - An empty array effectively retracts all votes
 *
 * All endpoints require authentication.
 */

// Zod runtime validation library — provides schema-based input validation
import { z } from "zod";
// tRPC error class for throwing typed errors (NOT_FOUND, BAD_REQUEST)
import { TRPCError } from "@trpc/server";
// Router factory and auth-guarded procedure from the shared tRPC setup
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const pollRouter = createTRPCRouter({
  // ── vote ─────────────────────────────────────────────────────────────────
  // Cast votes for a poll (or update existing votes). The user can select up
  // to poll.maxVotes options. Previous votes are fully replaced.
  vote: protectedProcedure
    .input(z.object({
      pollId: z.string(),
      // User can select 0 to poll.maxVotes options
      optionIds: z.array(z.string()).max(4),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify the poll exists and load its options
      const poll = await ctx.db.poll.findUnique({
        where: { id: input.pollId },
        include: { options: true },
      });
      if (!poll) throw new TRPCError({ code: "NOT_FOUND" });

      // Validate that all selected optionIds belong to this poll
      const validIds = new Set(poll.options.map((o) => o.id));
      for (const id of input.optionIds) {
        if (!validIds.has(id)) throw new TRPCError({ code: "BAD_REQUEST" });
      }
      // Validate that the user hasn't selected more options than allowed
      if (input.optionIds.length > poll.maxVotes) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      // Use a transaction to atomically replace all votes for this user+option
      // Deletes existing votes, then creates new ones
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
