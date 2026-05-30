/**
 * Home page — the main feed.
 * Features:
 * - "For You" tab: shows all posts
 * - "Following" tab: shows posts only from followed users
 * - Sticky tab header with active indicator
 * - CreatePost composer at the top
 * - PostCard list rendered from tRPC getFeed query
 * - Requires authentication (AuthGuard)
 */
"use client";
import { useState } from "react";
import AuthGuard from "~/app/_components/AuthGuard";
import CreatePost from "~/app/_components/CreatePost";
import PostCard from "~/app/_components/PostCard";
import LeftSidebar from "~/app/_components/LeftSidebar";
import RightSidebar from "~/app/_components/RightSidebar";
import { api } from "~/trpc/react";

function Feed({ onlyFollowing }: { onlyFollowing: boolean }) {
  const { data: posts, isLoading, error } = api.post.getFeed.useQuery({ onlyFollowing });

  if (isLoading) return <div className="p-4 text-neutral-500">Loading feed...</div>;
  if (error) return <div className="p-4 text-red-500">Error loading feed</div>;

  return (
    <div>
      {posts?.length === 0 && (
        <div className="p-6 text-neutral-500 text-center">
          {onlyFollowing
            ? "No posts from followed users yet. Follow someone!"
            : "No posts yet. Be the first to post!"}
        </div>
      )}
      {posts?.map((post) => (
        <PostCard key={post.id} {...post} />
      ))}
    </div>
  );
}

export default function HomePage() {
  const [tab, setTab] = useState<"forYou" | "following">("forYou");

  return (
    <AuthGuard>
      <div className="min-h-screen bg-black text-white flex justify-center">
        {/* Left Sidebar */}
        <LeftSidebar />

        {/* Center Feed */}
        <main className="flex-1 max-w-[600px] border-x border-neutral-800 min-h-screen">
          {/* Sticky Tab Header */}
          <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-neutral-800 flex">
            <button
              onClick={() => setTab("forYou")}
              className="flex-1 flex flex-col items-center pt-4 hover:bg-neutral-900/50 transition-colors"
            >
              <div className="relative pb-4">
                <span className={`text-[15px] font-semibold ${tab === "forYou" ? "text-white" : "text-neutral-500"}`}>
                  For you
                </span>
                {tab === "forYou" && (
                  <span className="absolute bottom-0 left-0 w-full h-1 bg-blue-500 rounded-full" />
                )}
              </div>
            </button>
            <button
              onClick={() => setTab("following")}
              className="flex-1 flex flex-col items-center pt-4 hover:bg-neutral-900/50 transition-colors"
            >
              <div className="relative pb-4">
                <span className={`text-[15px] font-semibold ${tab === "following" ? "text-white" : "text-neutral-500"}`}>
                  Following
                </span>
                {tab === "following" && (
                  <span className="absolute bottom-0 left-0 w-full h-1 bg-blue-500 rounded-full" />
                )}
              </div>
            </button>
          </div>

          {/* Create Post */}
          <CreatePost />

          {/* Feed */}
          <Feed onlyFollowing={tab === "following"} />
        </main>

        <RightSidebar />
      </div>
    </AuthGuard>
  );
}