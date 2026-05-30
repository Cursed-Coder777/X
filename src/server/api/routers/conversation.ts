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

// Zod runtime validation library — provides schema-based input validation
import { z } from "zod";
// Router factory and auth-guarded procedure from the shared tRPC setup
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// Export a single router for all conversation / direct-message procedures
export const conversationRouter = createTRPCRouter({
  // ── getConversations ───────────────────────────────────────────────────
  // List all conversations the current user participates in.  For each
  // conversation, returns the other user's profile, the most recent
  // message, and the number of unread messages (sent after the user's
  // lastReadAt timestamp, excluding the user's own messages).
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Fetch all ConversationParticipant rows for this user, including the
    // full conversation with its participants and the latest message
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

    // Compute unread counts per conversation by comparing each
    // participant's lastReadAt against message creation timestamps
    const unreadCounts = await Promise.all(
      participations.map(async (p) => {
        // Find the current user's participant record to get lastReadAt
        const lastRead = p.conversation.participants.find(
          (cp) => cp.userId === userId
        )?.lastReadAt;
        // If the user has never read the conversation, count all messages
        if (!lastRead) {
          const count = await ctx.db.message.count({
            where: { conversationId: p.conversation.id },
          });
          return count;
        }
        // Otherwise count only messages sent after lastReadAt by others
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

    // Shape the response and sort by most recent activity (last message
    // date, falling back to conversation creation date)
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

  // ── getOrCreate ────────────────────────────────────────────────────────
  // Find an existing 1-on-1 conversation between the current user and
  // the specified participant, or create a new one if none exists.
  // Prevents starting a conversation with yourself.
  getOrCreate: protectedProcedure
    .input(z.object({ participantId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      // Reject self-DM attempts
      if (userId === input.participantId) {
        throw new Error("Cannot start conversation with yourself");
      }

      // Look for a conversation that has both users as participants
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

      // No existing conversation — create one with both participants
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

  // ── getMessages ────────────────────────────────────────────────────────
  // Fetch all messages in a conversation, ordered oldest-first (chat
  // display order).  Each message includes the sender's profile and an
  // isOwn boolean flag for the current user.
  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify the caller is a participant — reject non-participants
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

      // Annotate each message with whether it was sent by the current user
      return messages.map((m) => ({
        ...m,
        isOwn: m.senderId === userId,
      }));
    }),

  // ── sendMessage ────────────────────────────────────────────────────────
  // Send a message in a conversation (max 1000 chars).  Verifies
  // participant status, creates the message, and automatically marks the
  // conversation as read for the sender.
  sendMessage: protectedProcedure
    .input(z.object({
      conversationId: z.string(),
      content: z.string().min(1).max(1000),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify participant status before sending
      const participant = await ctx.db.conversationParticipant.findUnique({
        where: {
          userId_conversationId: { userId, conversationId: input.conversationId },
        },
      });
      if (!participant) throw new Error("Not a participant in this conversation");

      // Persist the message with sender info eager-loaded
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

      // Auto-mark the conversation as read for the sender
      await ctx.db.conversationParticipant.update({
        where: { userId_conversationId: { userId, conversationId: input.conversationId } },
        data: { lastReadAt: new Date() },
      });
      return { ...message, isOwn: true };
    }),

  // ── markAsRead ─────────────────────────────────────────────────────────
  // Explicitly mark a conversation as read by setting lastReadAt to now.
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
