/**
 * Notification router — fetches and manages in-app notifications.
 *
 * Endpoints:
 * - getAll:        Fetch up to 50 most recent notifications for the current user
 * - getUnreadCount: Count of notifications where read === false
 * - markAsRead:    Mark a single notification as read (by id)
 * - markAllAsRead: Mark all of the current user's unread notifications as read
 *
 * Notifications are created by other routers (like toggleLike, toggleFollow,
 * create comment, etc.) and are read-only from this router.
 *
 * All endpoints require authentication.
 */

// Zod runtime validation library — provides schema-based input validation
import { z } from "zod";
// Router factory and auth-guarded procedure from the shared tRPC setup
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// Export a single router for all notification-related procedures
export const notificationRouter = createTRPCRouter({
  // ── getAll ─────────────────────────────────────────────────────────────
  // Fetch the 50 most recent notifications for the authenticated user.
  // Includes the actor (who performed the action) and, where applicable,
  // the related post's id and content.
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.notification.findMany({
      where: { recipientId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        actor: { select: { id: true, name: true, username: true, image: true } },
        post: { select: { id: true, content: true } },
      },
    });
  }),

  // ── getUnreadCount ─────────────────────────────────────────────────────
  // Return the count of notifications that have not yet been read by the
  // current user.  Used by the frontend to show a badge on the nav icon.
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.notification.count({
      where: { recipientId: ctx.session.user.id, read: false },
    });
  }),

  // ── markAsRead ─────────────────────────────────────────────────────────
  // Mark a single notification as read.  Uses updateMany with both the id
  // and recipientId so that one user cannot mark another's notification.
  markAsRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.notification.updateMany({
        where: { id: input.id, recipientId: ctx.session.user.id },
        data: { read: true },
      });
      return { success: true };
    }),

  // ── markAllAsRead ──────────────────────────────────────────────────────
  // Bulk-mark every unread notification belonging to the current user as
  // read.  Called when the user opens the notifications panel.
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.notification.updateMany({
      where: { recipientId: ctx.session.user.id, read: false },
      data: { read: true },
    });
    return { success: true };
  }),
});
