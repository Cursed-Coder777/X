"use client";
import { useState } from "react";
import AuthGuard from "~/app/_components/AuthGuard";
import CreatePost from "~/app/_components/CreatePost";
import PostCard from "~/app/_components/PostCard";
import ShellLayout from "~/app/_components/ShellLayout";
import { api } from "~/trpc/react";

function Feed({ onlyFollowing }: { onlyFollowing: boolean }) {
  const { data: posts, isLoading, error } = api.post.getFeed.useQuery({ onlyFollowing });

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <svg viewBox="0 0 24 24" className="h-8 w-8 fill-white animate-pulse" aria-label="Loading">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    </div>
  );
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
      <ShellLayout>
        <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-neutral-800 flex px-2">
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

        <CreatePost />
        <Feed onlyFollowing={tab === "following"} />
      </ShellLayout>
    </AuthGuard>
  );
}
