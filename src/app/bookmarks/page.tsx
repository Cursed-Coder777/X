/**
 * Bookmarks page — route: /bookmarks
 *
 * Displays all posts that the current user has bookmarked.
 * Fetches data via tRPC post.getBookmarkedPosts and renders each as a
 * PostCard. Covers loading, error, and empty states.
 */

"use client";

import AuthGuard from "~/app/_components/AuthGuard";
import PostCard from "~/app/_components/PostCard";
import ShellLayout from "~/app/_components/ShellLayout";
import { api } from "~/trpc/react";

export default function BookmarksPage() {
  const { data: posts, isLoading, error } = api.post.getBookmarkedPosts.useQuery();

  return (
    <AuthGuard>
      <ShellLayout>
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-neutral-800">
          <h1 className="text-xl font-bold px-4 py-4">Bookmarks</h1>
        </div>

        {/* Loading state */}
        {isLoading && <div className="p-4 text-neutral-500">Loading bookmarks...</div>}

        {/* Error state */}
        {error && <div className="p-4 text-red-500">Error loading bookmarks</div>}

        {/* Empty state */}
        {posts?.length === 0 && (
          <div className="p-6 text-neutral-500 text-center">
            No bookmarks yet. Tap the bookmark icon on a post to save it here.
          </div>
        )}

        {/* Bookmarked post list */}
        {posts?.map((post) => <PostCard key={post.id} {...post} />)}
      </ShellLayout>
    </AuthGuard>
  );
}
