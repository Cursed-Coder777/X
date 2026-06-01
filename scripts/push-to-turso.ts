/**
 * Push Prisma schema to Turso database.
 *
 * Run this on your LOCAL machine (where internet works):
 *   pnpm tsx scripts/push-to-turso.ts
 *
 * Make sure your .env has the TURSO values set:
 *   DATABASE_URL="libsql://x-clone-cursed-coder.aws-ap-south-1.turso.io"
 *   TURSO_AUTH_TOKEN="eyJhbGciOi...<your-token>"
 */
import { createClient } from "@libsql/client";
import "dotenv/config";

const sql = `
-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "image" TEXT,
    "bannerUrl" TEXT,
    "username" TEXT NOT NULL,
    "bio" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");

CREATE TABLE IF NOT EXISTS "Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "gifUrl" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("authorId") REFERENCES "User"("id")
);

CREATE TABLE IF NOT EXISTS "Like" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User"("id"),
    FOREIGN KEY ("postId") REFERENCES "Post"("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Like_userId_postId_key" ON "Like"("userId", "postId");

CREATE TABLE IF NOT EXISTS "Bookmark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User"("id"),
    FOREIGN KEY ("postId") REFERENCES "Post"("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Bookmark_userId_postId_key" ON "Bookmark"("userId", "postId");

CREATE TABLE IF NOT EXISTS "Repost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User"("id"),
    FOREIGN KEY ("postId") REFERENCES "Post"("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Repost_userId_postId_key" ON "Repost"("userId", "postId");

CREATE TABLE IF NOT EXISTS "Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User"("id"),
    FOREIGN KEY ("postId") REFERENCES "Post"("id"),
    FOREIGN KEY ("parentId") REFERENCES "Comment"("id")
);

CREATE TABLE IF NOT EXISTS "Follow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("followerId") REFERENCES "User"("id"),
    FOREIGN KEY ("followingId") REFERENCES "User"("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");

CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    FOREIGN KEY ("userId") REFERENCES "User"("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User"("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken");

CREATE TABLE IF NOT EXISTS "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

CREATE TABLE IF NOT EXISTS "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ConversationParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "lastReadAt" DATETIME,
    FOREIGN KEY ("userId") REFERENCES "User"("id"),
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ConversationParticipant_userId_conversationId_key" ON "ConversationParticipant"("userId", "conversationId");

CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("senderId") REFERENCES "User"("id"),
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
);

CREATE TABLE IF NOT EXISTS "Poll" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL UNIQUE,
    "expiresAt" DATETIME,
    "maxVotes" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("postId") REFERENCES "Post"("id")
);

CREATE TABLE IF NOT EXISTS "PollOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pollId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    FOREIGN KEY ("pollId") REFERENCES "Poll"("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PollOption_pollId_text_key" ON "PollOption"("pollId", "text");

CREATE TABLE IF NOT EXISTS "Vote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    FOREIGN KEY ("optionId") REFERENCES "PollOption"("id"),
    FOREIGN KEY ("userId") REFERENCES "User"("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Vote_optionId_userId_key" ON "Vote"("optionId", "userId");

CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipientId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "postId" TEXT,
    "commentId" TEXT,
    FOREIGN KEY ("recipientId") REFERENCES "User"("id"),
    FOREIGN KEY ("actorId") REFERENCES "User"("id"),
    FOREIGN KEY ("postId") REFERENCES "Post"("id"),
    FOREIGN KEY ("commentId") REFERENCES "Comment"("id")
);
CREATE INDEX IF NOT EXISTS "Notification_recipientId_read_idx" ON "Notification"("recipientId", "read");
CREATE INDEX IF NOT EXISTS "Notification_recipientId_createdAt_idx" ON "Notification"("recipientId", "createdAt");
`;

async function main() {
  const url = process.env.DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;

  if (!url || !token) {
    console.error("Set DATABASE_URL and TURSO_AUTH_TOKEN in .env first");
    process.exit(1);
  }

  console.log("Connecting to Turso...");
  const client = createClient({ url, authToken: token });

  console.log("Pushing schema...");
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    await client.execute(stmt);
  }

  console.log("Schema pushed to Turso successfully!");
  client.close();
}

main().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
