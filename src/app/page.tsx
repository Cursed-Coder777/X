/**
 * Home page — main feed with "For you" and "Following" tabs.
 * Uses infinite query with IntersectionObserver for scroll-based pagination.
 */

"use client";

// ── React Hooks ──────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from "react";

// ── Custom Components ────────────────────────────────────────────────────────
import AuthGuard from "~/app/_components/AuthGuard";       // Ensures user is authenticated
import CreatePost from "~/app/_components/CreatePost";     // Composer for new posts
import PostCard from "~/app/_components/PostCard";         // Individual post display
import ShellLayout from "~/app/_components/ShellLayout";   // App shell (sidebar, header, etc.)

// ── tRPC API ─────────────────────────────────────────────────────────────────
import { api } from "~/trpc/react";

/**
 * Feed component — renders an infinitely-scrolling list of posts.
 *
 * @param onlyFollowing — When true, only show posts from users the current user follows.
 */
function Feed({ onlyFollowing }: { onlyFollowing: boolean }) {
  // Fetch paginated feed data via tRPC infinite query
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.post.getFeed.useInfiniteQuery(
      { onlyFollowing },
      { getNextPageParam: (lastPage) => lastPage.nextCursor },
    );

  // Sentinel element ref for the IntersectionObserver trigger
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Set up an IntersectionObserver on the sentinel to trigger fetching the next page
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" }, // Start fetching 200px before the sentinel is visible
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten all pages into a single array of posts
  const posts = data?.pages.flatMap((page) => page.items) ?? [];

  // ── Loading state ───────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="flex justify-center pt-4">
      <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none" aria-label="Loading">
        <circle cx="12" cy="12" r="10" stroke="rgb(29,155,240)" strokeWidth="3" className="opacity-25" />
        <path d="M4 12a8 8 0 018-8" stroke="rgb(29,155,240)" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );

  // ── Error state ─────────────────────────────────────────────────────────
  if (error) return <div className="p-4 text-red-500">Error loading feed</div>;

  return (
    <div>
      {/* Empty state when there are no posts */}
      {posts.length === 0 && (
        <div className="p-6 text-neutral-500 text-center">
          {onlyFollowing
            ? "No posts from followed users yet. Follow someone!"
            : "No posts yet. Be the first to post!"}
        </div>
      )}

      {/* Render each post as a PostCard */}
      {posts.map((post) => (
        <PostCard key={post.id} {...post} />
      ))}

      {/* Invisible sentinel for infinite-scroll detection */}
      <div ref={sentinelRef} className="h-4" />

      {/* Loading spinner shown while fetching the next page */}
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" aria-label="Loading">
            <circle cx="12" cy="12" r="10" stroke="rgb(29,155,240)" strokeWidth="3" className="opacity-25" />
            <path d="M4 12a8 8 0 018-8" stroke="rgb(29,155,240)" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
}

/**
 * HomePage — the root route ("/") of the app.
 * Renders a sticky tab bar (For You / Following), a post composer, and the feed.
 */
export default function HomePage() {
  const [tab, setTab] = useState<"forYou" | "following">("forYou");

  return (
    <AuthGuard>
      <ShellLayout>
        {/* ── Sticky Tab Bar ─────────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-neutral-800 flex px-2">
          {/* "For you" tab */}
          <button
            onClick={() => setTab("forYou")}
            className="flex-1 flex flex-col items-center pt-4 hover:bg-neutral-900/50 transition-colors"
          >
            <div className="relative pb-4">
              <span className={`text-[15px] font-semibold ${tab === "forYou" ? "text-white" : "text-neutral-500"}`}>
                For you
              </span>
              {/* Active indicator underline */}
              {tab === "forYou" && (
                <span className="absolute bottom-0 left-0 w-full h-1 bg-blue-500 rounded-full" />
              )}
            </div>
          </button>

          {/* "Following" tab */}
          <button
            onClick={() => setTab("following")}
            className="flex-1 flex flex-col items-center pt-4 hover:bg-neutral-900/50 transition-colors"
          >
            <div className="relative pb-4">
              <span className={`text-[15px] font-semibold ${tab === "following" ? "text-white" : "text-neutral-500"}`}>
                Following
              </span>
              {/* Active indicator underline */}
              {tab === "following" && (
                <span className="absolute bottom-0 left-0 w-full h-1 bg-blue-500 rounded-full" />
              )}
            </div>
          </button>
        </div>

        {/* ── Post Composer ──────────────────────────────────────────────── */}
        <CreatePost />

        {/* ── Feed ───────────────────────────────────────────────────────── */}
        <Feed onlyFollowing={tab === "following"} />
      </ShellLayout>
    </AuthGuard>
  );
}
