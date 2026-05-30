/**
 * Conversation router — handles direct messaging between users.
 *
 * Endpoints:
 * - getConversations: List with last message, other user info, and unread counts
 *   (counts messages created after lastReadAt where sender is not current user)
 * - getOrCreate: Find existing 1-on-1 conversation or create one (prevents self-DM)
 * - getMessages: Messages in a conversation (isOwn flag per message)
 * - sendMessage: Send message (max 1000 chars), auto-marks conversation as read
 * - markAsRead: Update lastReadAt for the current user in a conversation
 *
 * All endpoints require authentication and participant verification.
 * Unread counts persisted via lastReadAt on ConversationParticipant.
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

    const unreadCounts = await Promise.all(
      participations.map(async (p) => {
        const lastRead = p.conversation.participants.find(
          (cp) => cp.userId === userId
        )?.lastReadAt;
        if (!lastRead) {
          const count = await ctx.db.message.count({
            where: { conversationId: p.conversation.id },
          });
          return count;
        }
        const count = await ctx.db.message.count({
          where: {
            conversationId: p.conversation.id,
            createdAt: { gt: lastRead },
            senderId: { not: userId },
          },
        });
        return count;
      })
    );

    return participations
      .map((p, i) => ({
        id: p.conversation.id,
        createdAt: p.conversation.createdAt,
        otherUser: p.conversation.participants
          .filter((cp) => cp.userId !== userId)
          .map((cp) => cp.user)[0] ?? null,
        lastMessage: p.conversation.messages[0] ?? null,
        unreadCount: unreadCounts[i] ?? 0,
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

      // Mark conversation as read when sending a message
      await ctx.db.conversationParticipant.update({
        where: { userId_conversationId: { userId, conversationId: input.conversationId } },
        data: { lastReadAt: new Date() },
      });
      return { ...message, isOwn: true };
    }),

  markAsRead: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.conversationParticipant.update({
        where: {
          userId_conversationId: { userId: ctx.session.user.id, conversationId: input.conversationId },
        },
        data: { lastReadAt: new Date() },
      });
      return { success: true };
    }),
});
