/**
 * tRPC app router root.
 * Combines all sub-routers (post, user, comment, conversation) into a single
 * AppRouter that is served at /api/trpc. Also exports the type for type-safe
 * client usage and a server-side caller factory for RSC.
 */

// Import every sub-router from the routers directory
import { postRouter } from "~/server/api/routers/post";
import { commentRouter } from "~/server/api/routers/comment";
import { conversationRouter } from "~/server/api/routers/conversation";
import { notificationRouter } from "~/server/api/routers/notification";
// Router factory and caller factory from the shared tRPC setup
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { userRouter } from "./routers/user";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
// Merge all feature routers under their respective namespaces.
// The resulting AppRouter is what tRPC serves at the /api/trpc endpoint.
export const appRouter = createTRPCRouter({
  post: postRouter,
  user: userRouter,
  comment: commentRouter,
  conversation: conversationRouter,
  notification: notificationRouter,
});

// Re-export the router's type so the client (both React and RSC) can
// consume it for full end-to-end type safety
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
// Factory that wraps the appRouter so server components can call
// procedures directly without an HTTP request
export const createCaller = createCallerFactory(appRouter);
