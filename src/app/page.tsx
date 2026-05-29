"use client";
import { useState } from "react";
import AuthGuard from "~/app/_components/AuthGuard";
import CreatePost from "~/app/_components/CreatePost";
import PostCard from "~/app/_components/PostCard";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils"; // optional, or use simple class strings

function Feed({ onlyFollowing }: { onlyFollowing: boolean }) {
  const { data: posts, isLoading, error } = api.post.getFeed.useQuery({ onlyFollowing });

  if (isLoading) return <div className="p-4">Loading feed...</div>;
  if (error) return <div className="p-4 text-red-500">Error loading feed</div>;

  return (
    <div className="divide-y">
      {posts?.length === 0 && (
        <div className="p-4 text-gray-500">
          {onlyFollowing ? "No posts from followed users. Follow someone!" : "No posts yet. Be the first to post!"}
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
      <div className="max-w-2xl mx-auto border-x min-h-screen">
        <div className="sticky top-0 bg-white border-b z-10">
          <div className="flex">
            <button
              onClick={() => setTab("forYou")}
              className={cn(
                "flex-1 py-4 font-semibold transition-colors relative",
                tab === "forYou" ? "text-blue-500" : "text-gray-500 hover:text-gray-700"
              )}
            >
              For You
              {tab === "forYou" && <span className="absolute bottom-0 left-0 w-full h-1 bg-blue-500 rounded-full" />}
            </button>
            <button
              onClick={() => setTab("following")}
              className={cn(
                "flex-1 py-4 font-semibold transition-colors relative",
                tab === "following" ? "text-blue-500" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Following
              {tab === "following" && <span className="absolute bottom-0 left-0 w-full h-1 bg-blue-500 rounded-full" />}
            </button>
          </div>
        </div>
        <CreatePost />
        <Feed onlyFollowing={tab === "following"} />
      </div>
    </AuthGuard>
  );
}