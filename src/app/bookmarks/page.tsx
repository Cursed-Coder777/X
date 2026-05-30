/**
 * Bookmarks page — displays all posts the current user has bookmarked.
 * Fetches data via tRPC post.getBookmarkedPosts and renders each as a PostCard.
 */

"use client";

// ── Custom Components ────────────────────────────────────────────────────────
import AuthGuard from "~/app/_components/AuthGuard";     // Ensures user is authenticated
import PostCard from "~/app/_components/PostCard";       // Individual post display
import ShellLayout from "~/app/_components/ShellLayout"; // App shell (sidebar, header, etc.)

// ── tRPC API ─────────────────────────────────────────────────────────────────
import { api } from "~/trpc/react";

/**
 * BookmarksPage — page route for "/bookmarks".
 * Requires authentication; shows loading, error, empty, and populated states.
 */
export default function BookmarksPage() {
  // Fetch all bookmarked posts for the current user
  const { data: posts, isLoading, error } = api.post.getBookmarkedPosts.useQuery();

  return (
    <AuthGuard>
      <ShellLayout>
        {/* ── Sticky Header ──────────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-neutral-800">
          <h1 className="text-xl font-bold px-4 py-4">Bookmarks</h1>
        </div>

        {/* ── Loading State ──────────────────────────────────────────────── */}
        {isLoading && <div className="p-4 text-neutral-500">Loading bookmarks...</div>}

        {/* ── Error State ────────────────────────────────────────────────── */}
        {error && <div className="p-4 text-red-500">Error loading bookmarks</div>}

        {/* ── Empty State ────────────────────────────────────────────────── */}
        {posts?.length === 0 && (
          <div className="p-6 text-neutral-500 text-center">
            No bookmarks yet. Tap the bookmark icon on a post to save it here.
          </div>
        )}

        {/* ── Post List ──────────────────────────────────────────────────── */}
        {posts?.map((post) => (
          <PostCard key={post.id} {...post} />
        ))}
      </ShellLayout>
    </AuthGuard>
  );
}
