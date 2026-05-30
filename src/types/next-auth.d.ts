/**
 * Type augmentation for next-auth.
 * Extends the default User type with a `username` field
 * and the Session.User type with `id` and `username` fields
 * to match our custom User model in Prisma.
 */
import "next-auth";

declare module "next-auth" {
  interface User {
    username?: string | null;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      username?: string | null;
    };
  }
}
