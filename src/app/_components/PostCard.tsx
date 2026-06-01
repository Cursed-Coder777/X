/**
 * PostCard — displays a single post in the feed or timeline.
 *
 * Features:
 *   - Author avatar (or fallback icon), name, username, and relative timestamp
 *   - Post content with hashtag/mention/URL rendering via renderContent()
 *   - Optional poll, GIF, and image displays
 *   - Action buttons: reply, repost, like, view count, bookmark, share
 *   - Optimistic UI updates for like, repost, and bookmark mutations
 *   - Dropdown menu (PostMenu) with follow/unfollow or delete options
 *   - ReplyModal for composing a reply inline
 *   - ConfirmModal for delete confirmation
 *
 * Handles both direct posts and reposts (shown with a repostedBy banner).
 */

"use client";

// tRPC client for mutations and query invalidation
import { api } from "~/trpc/react";
// NextAuth session — used for ownership checks
import { useSession } from "next-auth/react";
// React hooks for state management
import { useState, useEffect } from "react";
// UI icons for action buttons
import { MessageCircle, Repeat2, Heart, BarChart2, Bookmark, Upload, User } from "lucide-react";
// Router for navigation
import { useRouter } from "next/navigation";
// Sub-components
import ReplyModal from "./ReplyModal";
import ConfirmModal from "./ConfirmModal";
import PostMenu from "./PostMenu";
import { renderContent } from "./renderContent";
import PollDisplay from "./PollDisplay";

// ── Type Definitions ───────────────────────────────────────────────────────────

interface PollOptionData {
  id: string;
  text: string;
  _count: { votes: number };
}

interface PollData {
  id: string;
  options: PollOptionData[];
  expiresAt: Date | null;
  maxVotes: number;
  userVotedOptionIds: string[];
}

interface PostCardProps {
  id: string;
  content: string;
  imageUrl?: string | null;
  gifUrl?: string | null;
  author: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  };
  createdAt: Date;
  likedByUser: boolean;
  likeCount: number;
  commentCount?: number;
  bookmarkedByUser?: boolean;
  repostedByUser?: boolean;
  repostCount?: number;
  repostedBy?: { name: string | null; username: string | null } | null;
  poll?: PollData | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Returns a short relative timestamp (e.g. "5s", "3m", "2h", "1d") */
function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffSecs < 60) return `${diffSecs}s`;
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function PostCard({
  id,
  content,
  imageUrl,
  gifUrl,
  author,
  createdAt,
  likedByUser: initialLiked,
  likeCount: initialCount,
  commentCount = 0,
  bookmarkedByUser: initialBookmarked = false,
  repostedByUser: initialReposted = false,
  repostCount: initialRepostCount = 0,
  repostedBy = null,
  poll,
}: PostCardProps) {
  // ── Local UI State ─────────────────────────────────────────────────────────
  // Track interaction states locally for optimistic updates
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isReposted, setIsReposted] = useState(initialReposted);
  const [repostCount, setRepostCount] = useState(initialRepostCount);
  // Modal visibility toggles
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // tRPC utility bag for cache invalidation
  const utils = api.useUtils();

  // ── Optimistic Like Toggle ─────────────────────────────────────────────────
  const toggleLike = api.post.toggleLike.useMutation({
    onMutate: async () => {
      await utils.post.getAll.cancel();
      const newLiked = !isLiked;
      setIsLiked(newLiked);
      setLikeCount((c) => (newLiked ? c + 1 : c - 1));
      return { previousLiked: isLiked, previousCount: likeCount };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousLiked !== undefined) {
        setIsLiked(context.previousLiked);
        setLikeCount(context.previousCount);
      }
    },
    onSettled: () => {
      void utils.post.getAll.invalidate().catch(console.error);
    },
  });

  // ── Optimistic Bookmark Toggle ─────────────────────────────────────────────
  const toggleBookmark = api.post.toggleBookmark.useMutation({
    onMutate: async () => {
      await utils.post.getAll.cancel();
      await utils.post.getBookmarkedPosts.cancel();
      setIsBookmarked((prev) => !prev);
    },
    onError: () => {
      setIsBookmarked((prev) => !prev);
    },
    onSettled: () => {
      void utils.post.getAll.invalidate().catch(console.error);
      void utils.post.getBookmarkedPosts.invalidate().catch(console.error);
    },
  });

  // ── Optimistic Repost Toggle ───────────────────────────────────────────────
  const toggleRepost = api.post.toggleRepost.useMutation({
    onMutate: async () => {
      await utils.post.getAll.cancel();
      const newReposted = !isReposted;
      setIsReposted(newReposted);
      setRepostCount((c) => (newReposted ? c + 1 : c - 1));
    },
    onError: () => {
      setIsReposted((prev) => !prev);
      setRepostCount((prev) => (isReposted ? prev - 1 : prev + 1));
    },
    onSettled: () => {
      void utils.post.getAll.invalidate().catch(console.error);
      void utils.post.getFeed.invalidate().catch(console.error);
    },
  });

  // ── Session & Navigation ───────────────────────────────────────────────────
  const { data: session } = useSession();
  const router = useRouter();

  // ── Delete Post ────────────────────────────────────────────────────────────
  const deletePost = api.post.delete.useMutation({
    onSuccess: () => {
      void utils.post.getAll.invalidate().catch(console.error);
      void utils.post.getFeed.invalidate().catch(console.error);
      void utils.post.getBookmarkedPosts.invalidate().catch(console.error);
      void utils.user.getUserPosts.invalidate().catch(console.error);
    },
  });

  // ── Follow State (for PostMenu) ────────────────────────────────────────────
  const isOwnPost = session?.user?.id === author.id;
  const [isFollowing, setIsFollowing] = useState(false);
  const { data: followStatus } = api.user.isFollowing.useQuery(
    { targetUserId: author.id },
    { enabled: !!session && !isOwnPost },
  );
  useEffect(() => {
    if (followStatus?.isFollowing !== undefined) {
      setIsFollowing(followStatus.isFollowing);
    }
  }, [followStatus?.isFollowing]);

  const toggleFollow = api.user.toggleFollow.useMutation({
    onMutate: async () => {
      await utils.user.isFollowing.cancel();
      setIsFollowing((prev) => !prev);
    },
    onError: () => {
      setIsFollowing((prev) => !prev);
    },
    onSettled: () => {
      void utils.user.isFollowing.invalidate({ targetUserId: author.id }).catch(console.error);
    },
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <article
      onClick={() => router.push(`/post/${id}`)}
      className="border-b border-neutral-800 px-4 py-3 cursor-pointer hover:bg-neutral-900/50 transition-colors"
    >
      {/* Reposted-by banner */}
      {repostedBy && (
        <div className="flex items-center gap-1 text-[13px] text-neutral-500 mb-2 pl-1">
          <Repeat2 size={14} className="text-green-500" />
          <span>@{repostedBy.username ?? repostedBy.name} reposted</span>
        </div>
      )}

      <div className="flex gap-3">
        {/* Author avatar */}
        <div className="flex-shrink-0">
          {author.image ? (
            <img
              src={author.image}
              alt={author.name ?? "Avatar"}
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

        {/* Post body */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Author row: name, @username, dot, timestamp, menu */}
          <div className="flex items-center gap-1 text-[15px]">
            <button
              onClick={(e) => { e.stopPropagation(); router.push(`/profile/${author.username ?? ""}`); }}
              className="font-bold text-white leading-5 truncate max-w-[120px] sm:max-w-[200px] hover:underline text-left"
            >
              {author.name ?? "Unknown"}
            </button>
            <span className="text-neutral-500 truncate">@{author.username}</span>
            <span className="text-neutral-500 flex-shrink-0">·</span>
            <span className="text-neutral-500 flex-shrink-0">{timeAgo(createdAt)}</span>
            {/* Three-dot context menu */}
            <PostMenu
              isOwnPost={isOwnPost}
              authorUsername={author.username ?? ""}
              authorId={author.id}
              isFollowing={isFollowing}
              toggleFollow={toggleFollow}
              onDelete={() => setShowDeleteConfirm(true)}
            />
          </div>

          {/* Post content with hashtag/mention/URL rendering */}
          <div className="text-[15px] text-white leading-normal whitespace-pre-wrap break-words mt-0.5">
            {renderContent(content, router)}
          </div>

          {/* Poll widget */}
          {poll && (
            <div onClick={(e) => e.stopPropagation()}>
              <PollDisplay poll={poll} postId={id} />
            </div>
          )}

          {/* GIF attachment */}
          {gifUrl && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-neutral-700">
              <img src={gifUrl} alt="GIF" width={500} height={300} className="w-full max-h-80 object-cover" />
            </div>
          )}

          {/* Image attachment */}
          {imageUrl && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-neutral-700">
              <img src={imageUrl} alt="Post image" width={500} height={300} className="w-full max-h-80 object-cover" />
            </div>
          )}

          {/* Action buttons row */}
          <div className="flex items-center justify-between mt-3 text-neutral-500 max-w-[425px] -ml-2">
            {/* Reply */}
            <button
              onClick={(e) => { e.stopPropagation(); setShowReplyModal(true); }}
              className="group flex items-center gap-1.5 p-2 rounded-full transition-colors hover:text-[rgb(29,155,240)] cursor-pointer"
            >
              <span className="p-2 rounded-full group-hover:bg-[rgba(29,155,240,0.1)] transition-colors">
                <MessageCircle size={18} strokeWidth={1.5} />
              </span>
              {commentCount > 0 ? commentCount : <></>}
            </button>

            {/* Repost */}
            <button
              onClick={(e) => { e.stopPropagation(); handleRepost(); }}
              disabled={toggleRepost.isPending}
              className={`group flex items-center gap-1.5 p-2 rounded-full transition-colors cursor-pointer ${isReposted ? "text-[rgb(0,186,124)]" : "hover:text-[rgb(0,186,124)]"}`}
            >
              <span className={`p-2 rounded-full transition-colors ${isReposted ? "" : "group-hover:bg-[rgba(0,186,124,0.1)]"}`}>
                <Repeat2 size={18} strokeWidth={1.5} className={isReposted ? "fill-[rgb(0,186,124)]" : ""} />
              </span>
              {repostCount > 0 && <span className={`text-sm -ml-1.5 ${isReposted ? "text-[rgb(0,186,124)]" : ""}`}>{repostCount}</span>}
            </button>

            {/* Like */}
            <button
              onClick={(e) => { e.stopPropagation(); handleLike(); }}
              disabled={toggleLike.isPending}
              className={`group flex items-center gap-1.5 p-2 rounded-full transition-colors cursor-pointer ${isLiked ? "text-[rgb(249,24,128)]" : "hover:text-[rgb(249,24,128)]"}`}
            >
              <span className={`p-2 rounded-full transition-colors ${isLiked ? "" : "group-hover:bg-[rgba(249,24,128,0.1)]"}`}>
                <Heart size={18} strokeWidth={1.5} className={isLiked ? "fill-[rgb(249,24,128)]" : ""} />
              </span>
              {likeCount > 0 && <span className={`text-sm -ml-1.5 ${isLiked ? "text-[rgb(249,24,128)]" : ""}`}>{likeCount}</span>}
            </button>

            {/* View count (placeholder) */}
            <button
              onClick={(e) => { e.stopPropagation(); }}
              className="group flex items-center gap-1.5 p-2 rounded-full transition-colors hover:text-[rgb(29,155,240)] cursor-pointer"
            >
              <span className="p-2 rounded-full group-hover:bg-[rgba(29,155,240,0.1)] transition-colors">
                <BarChart2 size={18} strokeWidth={1.5} />
              </span>
            </button>

            {/* Bookmark and Share */}
            <div className="flex items-center">
              <button
                onClick={(e) => { e.stopPropagation(); handleBookmark(); }}
                disabled={toggleBookmark.isPending}
                className={`group p-2 rounded-full transition-colors cursor-pointer ${isBookmarked ? "text-[rgb(29,155,240)]" : "hover:text-[rgb(29,155,240)]"}`}
              >
                <span className={`p-2 rounded-full transition-colors block ${isBookmarked ? "" : "group-hover:bg-[rgba(29,155,240,0.1)]"}`}>
                  <Bookmark size={18} strokeWidth={1.5} className={isBookmarked ? "fill-[rgb(29,155,240)]" : ""} />
                </span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); }}
                className="group p-2 rounded-full transition-colors hover:text-[rgb(29,155,240)] cursor-pointer"
              >
                <span className="p-2 rounded-full group-hover:bg-[rgba(29,155,240,0.1)] transition-colors block">
                  <Upload size={18} strokeWidth={1.5} />
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reply modal */}
      {showReplyModal && (
        <ReplyModal
          postId={id}
          authorName={author.name}
          authorUsername={author.username}
          authorImage={author.image}
          postContent={content}
          onClose={() => setShowReplyModal(false)}
        />
      )}

      {/* Delete confirmation modal */}
      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete post?"
        message="This can't be undone and it will be removed from your profile, the timeline of any accounts that follow you, and from search results."
        confirmLabel="Delete"
        onConfirm={() => {
          deletePost.mutate({ postId: id });
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </article>
  );
}
