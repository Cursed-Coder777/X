/**
 * Type augmentation for next-auth.
 *
 * This module extends the default NextAuth type definitions to match the
 * custom User model defined in the Prisma schema.
 *
 * By default, next-auth's Session.User only has name, email, and image.
 * Our User model also has an `id` (string CUID) and `username` (unique string),
 * so we augment the Session and User interfaces to include these fields.
 *
 * Without this augmentation, accessing session.user.id or
 * session.user.username would cause TypeScript errors.
 */

// Import the next-auth module to augment its types
import "next-auth";

// Augment the default type declarations from next-auth
declare module "next-auth" {
  // Extend the User type to include the optional username field
  // (matches the Prisma User model which has username: String @unique)
  interface User {
    username?: string | null;
  }

  // Extend the Session type to include id and username on the user object
  // The id is cast from the JWT token in the jwt() callback
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
