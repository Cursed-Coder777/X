/**
 * Bookmarks page — shows all posts bookmarked by the current user.
 * Data fetched via post.getBookmarkedPosts tRPC query.
 * Displays an empty state message if no bookmarks exist.
 * Requires authentication (AuthGuard).
 */
"use client";
import AuthGuard from "~/app/_components/AuthGuard";
import PostCard from "~/app/_components/PostCard";
import LeftSidebar from "~/app/_components/LeftSidebar";
import RightSidebar from "~/app/_components/RightSidebar";
import { api } from "~/trpc/react";

export default function BookmarksPage() {
  const { data: posts, isLoading, error } = api.post.getBookmarkedPosts.useQuery();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-black text-white flex justify-center">
        <LeftSidebar />
        <main className="flex-1 max-w-[600px] border-x border-neutral-800 min-h-screen">
          <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-neutral-800">
            <h1 className="text-xl font-bold px-4 py-4">Bookmarks</h1>
          </div>

          {isLoading && <div className="p-4 text-neutral-500">Loading bookmarks...</div>}
          {error && <div className="p-4 text-red-500">Error loading bookmarks</div>}

          {posts?.length === 0 && (
            <div className="p-6 text-neutral-500 text-center">
              No bookmarks yet. Tap the bookmark icon on a post to save it here.
            </div>
          )}

          {posts?.map((post) => (
            <PostCard key={post.id} {...post} />
          ))}
        </main>
        <RightSidebar />
      </div>
    </AuthGuard>
  );
}
