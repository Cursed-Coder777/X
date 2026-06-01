/**
 * Post detail page — route: /post/[postId]
 *
 * Displays a single post with full content, author info, stats, and an
 * interactive comment section. Dynamically updates the document title
 * to show a preview of the post content.
 *
 * Features:
 *   - Back link to home feed
 *   - Author avatar, name, @username (linked to profile)
 *   - Post content (text, poll, GIF, image, timestamp)
 *   - Like and comment counts
 *   - Nested comment thread via CommentSection
 *   - Loading and not-found states
 */

"use client";

// Params hook to read [postId] from the URL
import { useParams } from "next/navigation";
// tRPC client for fetching the post
import { api } from "~/trpc/react";
// Effect for updating the document title dynamically
import { useEffect } from "react";
// Icons for fallback avatar and stats
import { User, Heart, MessageCircle } from "lucide-react";
// Next.js image component and link
import Image from "next/image";
import Link from "next/link";
// App components
import AuthGuard from "~/app/_components/AuthGuard";
import CommentSection from "~/app/_components/CommentSection";
import ShellLayout from "~/app/_components/ShellLayout";
import PollDisplay from "~/app/_components/PollDisplay";

export default function PostPage() {
  // Read the postId from dynamic route params
  const params = useParams<{ postId: string }>();
  const postId = params?.postId ?? "";

  // Fetch the post by ID (only when postId is available)
  const { data: post, isLoading } = api.post.getById.useQuery(
    { id: postId },
    { enabled: !!postId }
  );

  // Dynamically update the document title as data loads
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

  // Loading & error states
  if (isLoading) return <div className="p-8 text-neutral-500">Loading post...</div>;
  if (!post) return <div className="p-8 text-neutral-500">Post not found</div>;

  return (
    <AuthGuard>
      <ShellLayout>
        {/* Sticky header with back link */}
        <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-neutral-800">
          <div className="px-4 py-3">
            <Link href="/" className="text-white text-xl font-bold hover:underline">
              &larr; Post
            </Link>
          </div>
        </div>

        {/* Post content */}
        <div className="px-4 py-3 flex gap-3">
          {/* Author avatar */}
          <div className="flex-shrink-0">
            {post.author.image ? (
              <Image src={post.author.image} alt={post.author.name ?? "Avatar"} className="h-10 w-10 rounded-full object-cover" width={40} height={40} />
            ) : (
              <div className="h-10 w-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-500">
                <User size={20} />
              </div>
            )}
          </div>

          {/* Post body */}
          <div className="flex-1 min-w-0">
            {/* Author name & @username */}
            <div className="flex items-center gap-1 text-[15px]">
              <Link href={`/profile/${post.author.username ?? ""}`} className="font-bold text-white hover:underline">
                {post.author.name ?? "Unknown"}
              </Link>
              <span className="text-neutral-500 truncate">@{post.author.username}</span>
            </div>

            {/* Content text */}
            <p className="text-[15px] text-white whitespace-pre-wrap break-words mt-2">{post.content}</p>

            {/* Poll */}
            {post.poll && (
              <div onClick={(e) => e.stopPropagation()}>
                <PollDisplay poll={post.poll} postId={post.id} />
              </div>
            )}

            {/* GIF attachment */}
            {post.gifUrl && (
              <div className="mt-3 rounded-2xl overflow-hidden border border-neutral-700">
                <img src={post.gifUrl} alt="GIF" width={500} height={300} className="w-full max-h-80 object-cover" />
              </div>
            )}

            {/* Image attachment */}
            {post.imageUrl && (
              <div className="mt-3 rounded-2xl overflow-hidden border border-neutral-700">
                <img src={post.imageUrl} alt="Post image" width={500} height={300} className="w-full max-h-80 object-cover" />
              </div>
            )}

            {/* Timestamp */}
            <span className="text-sm text-neutral-500 mt-2 block">
              {new Date(post.createdAt).toLocaleString()}
            </span>

            {/* Stats row */}
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

        {/* Comment thread */}
        <CommentSection postId={postId} />
      </ShellLayout>
    </AuthGuard>
  );
}
