/**
 * Conversation router — handles direct messaging between users.
 *
 * Endpoints:
 * - getConversations: List user's conversations with last message + other user info
 * - getOrCreate: Find existing 1-on-1 conversation or create a new one
 * - getMessages: Get messages in a conversation (with isOwn flag per message)
 * - sendMessage: Send a message in a conversation (max 1000 chars)
 *
 * All endpoints require authentication.
 * getMessages and sendMessage verify the user is a participant in the conversation.
 * getOrCreate prevents starting a conversation with yourself.
 */
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const conversationRouter = createTRPCRouter({
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const participations = await ctx.db.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: { select: { id: true, name: true, username: true, image: true } },
              },
            },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    return participations
      .map((p) => ({
        id: p.conversation.id,
        createdAt: p.conversation.createdAt,
        otherUser: p.conversation.participants
          .filter((cp) => cp.userId !== userId)
          .map((cp) => cp.user)[0] ?? null,
        lastMessage: p.conversation.messages[0] ?? null,
        unreadCount: 0,
      }))
      .sort((a, b) => {
        const aTime = a.lastMessage?.createdAt.getTime() ?? a.createdAt.getTime();
        const bTime = b.lastMessage?.createdAt.getTime() ?? b.createdAt.getTime();
        return bTime - aTime;
      });
  }),

  getOrCreate: protectedProcedure
    .input(z.object({ participantId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      if (userId === input.participantId) {
        throw new Error("Cannot start conversation with yourself");
      }

      // Find existing conversation where both are participants
      const existing = await ctx.db.conversation.findFirst({
        where: {
          AND: [
            { participants: { some: { userId } } },
            { participants: { some: { userId: input.participantId } } },
          ],
        },
        select: { id: true },
      });

      if (existing) return { id: existing.id };

      // Create new conversation
      const conversation = await ctx.db.conversation.create({
        data: {
          participants: {
            create: [
              { userId },
              { userId: input.participantId },
            ],
          },
        },
      });

      return { id: conversation.id };
    }),

  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      // Verify user is a participant
      const participant = await ctx.db.conversationParticipant.findUnique({
        where: {
          userId_conversationId: { userId, conversationId: input.conversationId },
        },
      });
      if (!participant) throw new Error("Not a participant in this conversation");

      const messages = await ctx.db.message.findMany({
        where: { conversationId: input.conversationId },
        orderBy: { createdAt: "asc" },
        include: {
          sender: { select: { id: true, name: true, username: true, image: true } },
        },
      });

      return messages.map((m) => ({
        ...m,
        isOwn: m.senderId === userId,
      }));
    }),

  sendMessage: protectedProcedure
    .input(z.object({
      conversationId: z.string(),
      content: z.string().min(1).max(1000),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      // Verify user is a participant
      const participant = await ctx.db.conversationParticipant.findUnique({
        where: {
          userId_conversationId: { userId, conversationId: input.conversationId },
        },
      });
      if (!participant) throw new Error("Not a participant in this conversation");

      const message = await ctx.db.message.create({
        data: {
          content: input.content,
          senderId: userId,
          conversationId: input.conversationId,
        },
        include: {
          sender: { select: { id: true, name: true, username: true, image: true } },
        },
      });

      return { ...message, isOwn: true };
    }),
});
