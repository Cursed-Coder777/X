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
      </ShellLayout>
    </AuthGuard>
  );
}
