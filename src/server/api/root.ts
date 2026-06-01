/**
 * tRPC app router root.
 *
 * This file is the central registry for all tRPC sub-routers. Every feature
 * router (post, user, comment, conversation, notification, poll) must be
 * imported and merged here. The resulting AppRouter type is exported for
 * end-to-end type safety on the client side.
 *
 * Also exports:
 *   - AppRouter type   — used by the tRPC client for full type inference
 *   - createCaller     — factory for server-side calls (used in RSC)
 */

// Import every sub-router from the routers directory.
// Each router is created by createTRPCRouter() in its respective file and
// exports its own set of queries and mutations.
import { postRouter } from "~/server/api/routers/post";
import { commentRouter } from "~/server/api/routers/comment";
import { conversationRouter } from "~/server/api/routers/conversation";
import { notificationRouter } from "~/server/api/routers/notification";
import { pollRouter } from "~/server/api/routers/poll";
import { userRouter } from "~/server/api/routers/user";

// Router factory and caller factory from the shared tRPC setup
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 *
 * The keys (post, user, comment, etc.) become the first segment of the
 * procedure path: e.g. api.post.getAll(), api.user.signup()
 */
// Merge all feature routers under their respective namespaces.
// The resulting AppRouter is what tRPC serves at the /api/trpc endpoint.
export const appRouter = createTRPCRouter({
  post: postRouter,
  user: userRouter,
  comment: commentRouter,
  conversation: conversationRouter,
  notification: notificationRouter,
  poll: pollRouter,
});

// Re-export the router's type so the client (both React and RSC) can
// consume it for full end-to-end type safety
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 *
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *
 * Used by src/trpc/server.ts to enable data fetching in React Server
 * Components without making an HTTP round-trip.
 */
// Factory that wraps the appRouter so server components can call
// procedures directly without an HTTP request
export const createCaller = createCallerFactory(appRouter);
