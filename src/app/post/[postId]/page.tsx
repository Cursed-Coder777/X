/**
 * Post detail page — shows a single post with full content and interaction stats.
 * Fetches post by [postId] param via post.getById.
 * Displays author avatar, name, username, content, timestamp, like/comment counts.
 * Includes CommentSection for viewing and posting replies.
 * Requires authentication (AuthGuard).
 */
"use client";
import { useParams } from "next/navigation";
import { api } from "~/trpc/react";
import { useEffect } from "react";
import { User, Heart, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import AuthGuard from "~/app/_components/AuthGuard";
import CommentSection from "~/app/_components/CommentSection";
import LeftSidebar from "~/app/_components/LeftSidebar";
import RightSidebar from "~/app/_components/RightSidebar";

export default function PostPage() {
  const params = useParams<{ postId: string }>();
  const postId = params?.postId ?? "";

  const { data: post, isLoading } = api.post.getById.useQuery(
    { id: postId },
    { enabled: !!postId }
  );

  useEffect(() => {
    if (isLoading) {
      document.title = "Loading... / X";
    } else if (post) {
      const preview = post.content.replace(/\n/g, " ").slice(0, 50);
      document.title = `${preview} / X`;
    } else {
      document.title = "Post not found / X";
    }
  }, [isLoading, post]);

  if (isLoading) return <div className="p-8 text-neutral-500">Loading post...</div>;
  if (!post) return <div className="p-8 text-neutral-500">Post not found</div>;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-black text-white flex justify-center">
        <LeftSidebar />
        <main className="flex-1 max-w-[600px] border-x border-neutral-800 min-h-screen">
          {/* Back button */}
          <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-neutral-800">
            <div className="px-4 py-3">
              <Link href="/" className="text-white text-xl font-bold hover:underline">
                &larr; Post
              </Link>
            </div>
          </div>

          {/* Post content */}
          <div className="px-4 py-3 flex gap-3">
            <div className="flex-shrink-0">
              {post.author.image ? (
                <Image
                  src={post.author.image}
                  alt={post.author.name ?? "Avatar"}
                  className="h-10 w-10 rounded-full object-cover"
                  width={40}
                  height={40}
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-500">
                  <User size={20} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 text-[15px]">
                <Link
                  href={`/profile/${post.author.username ?? ""}`}
                  className="font-bold text-white hover:underline"
                >
                  {post.author.name ?? "Unknown"}
                </Link>
                <span className="text-neutral-500 truncate">@{post.author.username}</span>
              </div>
              <p className="text-[15px] text-white whitespace-pre-wrap break-words mt-2">
                {post.content}
              </p>
              <span className="text-sm text-neutral-500 mt-2 block">
                {new Date(post.createdAt).toLocaleString()}
              </span>
              <div className="flex gap-6 mt-3 text-neutral-500 text-sm border-t border-neutral-800 pt-3">
                <span className="flex items-center gap-1">
                  <MessageCircle size={18} strokeWidth={1.5} />
                  {post.commentCount}
                </span>
                <span className="flex items-center gap-1">
                  <Heart size={18} strokeWidth={1.5} className={post.likedByUser ? "fill-[rgb(249,24,128)] text-[rgb(249,24,128)]" : ""} />
                  {post.likeCount}
                </span>
              </div>
            </div>
          </div>

          {/* Comments */}
          <CommentSection postId={postId} />
        </main>
        <RightSidebar />
      </div>
    </AuthGuard>
  );
}
