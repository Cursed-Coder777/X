/**
 * PostCard — renders a single post in the feed.
 *
 * Layout:
 *   [Reposted-by label] (optional, shown when someone you follow reposted)
 *   [Avatar (left)] | [Header row: name @username · time | 3-dot menu]
 *                    | [Body: post content with link detection]
 *                    | [Image: optional inline image]
 *                    | [Action row: reply, repost, like, views, bookmark+share]
 *
 * All interaction state is optimistic with rollback on error.
 * Mutations invalidate relevant tRPC queries on settle/success.
 */
"use client";

// ── Imports ──────────────────────────────────────────────────────────────────
import { api } from "~/trpc/react";
// useSession gives us the current logged-in user's data (id, name, etc.)
import { useSession } from "next-auth/react";
// useState for local UI state, useEffect for syncing follow status
import { useState, useEffect } from "react";
// lucide-react icons — each maps to a standard X action
import { MessageCircle, Repeat2, Heart, BarChart2, Bookmark, Upload, User } from "lucide-react";
// useRouter for client-side navigation (profile pages, etc.)
import { useRouter } from "next/navigation";
// ReplyModal — the overlay that opens when clicking the reply icon
import ReplyModal from "./ReplyModal";
// ConfirmModal — custom delete confirmation dialog (replaces browser confirm())
import ConfirmModal from "./ConfirmModal";
// PostMenu — the 3-dot dropdown (delete / follow / unfollow)
import PostMenu from "./PostMenu";
// renderContent — transforms post body text, rendering @mentions, #hashtags, and links as clickable elements
import { renderContent } from "./renderContent";

// ── Props Interface ──────────────────────────────────────────────────────────
interface PostCardProps {
  // Core post fields returned by every feed query
  id: string;
  content: string;                     // post body (plain text, up to 280 chars)
  imageUrl?: string | null;            // optional attached image
  author: {                            // post author — always included by API
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;              // avatar URL
  };
  createdAt: Date;                     // when the post was created

  // Interaction statuses — computed by the backend per logged-in user
  likedByUser: boolean;
  likeCount: number;
  commentCount?: number;               // number of replies
  bookmarkedByUser?: boolean;          // whether current user bookmarked this

  // Repost fields — included when the feed query returns them (especially the "following" tab)
  repostedByUser?: boolean;            // whether current user reposted this
  repostCount?: number;                // total repost count
  repostedBy?: {                       // who reposted (shown in "following" feed)
    name: string | null;
    username: string | null;
  } | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * timeAgo — formats a Date into a relative time string (e.g. "5m", "2h", "3d").
 * Falls back from seconds → minutes → hours → days.
 */
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

// ── Component ────────────────────────────────────────────────────────────────

export default function PostCard({
  // Destructure all props with defaults for optional booleans/numbers
  id,
  content,
  imageUrl,
  author,
  createdAt,
  likedByUser: initialLiked,
  likeCount: initialCount,
  commentCount = 0,
  bookmarkedByUser: initialBookmarked = false,
  repostedByUser: initialReposted = false,
  repostCount: initialRepostCount = 0,
  repostedBy = null,                   // null means this post was not reposted by anyone the current user follows
}: PostCardProps) {
  // ── Like State & Mutation ──────────────────────────────────────────────────
  // Optimistic local state — flips immediately, rolls back on error
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);

  // ── Bookmark State & Mutation ──────────────────────────────────────────────
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);

  // ── Repost State & Mutation ────────────────────────────────────────────────
  const [isReposted, setIsReposted] = useState(initialReposted);
  const [repostCount, setRepostCount] = useState(initialRepostCount);

  // ── Modal States ────────────────────────────────────────────────────────────
  const [showReplyModal, setShowReplyModal] = useState(false);     // reply compose overlay
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // delete confirmation

  // ── tRPC Utils ─────────────────────────────────────────────────────────────
  // Provides access to all tRPC query caches for invalidation after mutations
  const utils = api.useUtils();

  // ── Like Mutation ──────────────────────────────────────────────────────────
  // Optimistic: flips isLiked + adjusts count immediately, reverts on error
  const toggleLike = api.post.toggleLike.useMutation({
    onMutate: async () => {
      // Cancel any in-flight getAll query so the cache snapshot is clean
      await utils.post.getAll.cancel();
      const previousData = utils.post.getAll.getData();
      const newLiked = !isLiked;
      setIsLiked(newLiked);
      setLikeCount((c) => (newLiked ? c + 1 : c - 1));
      // Return previous state so we can roll back if the server rejects
      return { previousData, previousLiked: isLiked, previousCount: likeCount };
    },
    // If the server returns an error, restore the optimistic update
    onError: (_err, _variables, context) => {
      if (context?.previousLiked !== undefined) {
        setIsLiked(context.previousLiked);
        setLikeCount(context.previousCount);
      }
    },
    // Always refetch the feed to get canonical state from the server
    onSettled: () => {
      void utils.post.getAll.invalidate().catch(console.error);
    },
  });

  // ── Bookmark Mutation ──────────────────────────────────────────────────────
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

  // ── Repost Mutation ────────────────────────────────────────────────────────
  const toggleRepost = api.post.toggleRepost.useMutation({
    onMutate: async () => {
      await utils.post.getAll.cancel();
      const newReposted = !isReposted;
      setIsReposted(newReposted);
      setRepostCount((c) => (newReposted ? c + 1 : c - 1));
    },
    onError: () => {
      // Roll back both state variables to their previous values
      setIsReposted((prev) => !prev);
      setRepostCount((prev) => (isReposted ? prev - 1 : prev + 1));
    },
    onSettled: () => {
      void utils.post.getAll.invalidate().catch(console.error);
      void utils.post.getFeed.invalidate().catch(console.error);
    },
  });

  // ── Session ────────────────────────────────────────────────────────────────
  const { data: session } = useSession();

  // ── Delete Post Mutation ────────────────────────────────────────────────────
  const deletePost = api.post.delete.useMutation({
    // Only runs on success (no optimistic removal needed since ConfirmModal confirms intent)
    onSuccess: () => {
      void utils.post.getAll.invalidate().catch(console.error);
      void utils.post.getFeed.invalidate().catch(console.error);
      void utils.post.getBookmarkedPosts.invalidate().catch(console.error);
      void utils.user.getUserPosts.invalidate().catch(console.error);
    },
  });

  // ── Router ─────────────────────────────────────────────────────────────────
  const router = useRouter();

  // ── Event Handlers ─────────────────────────────────────────────────────────
  // Each guarded by .isPending to prevent double-clicks while a mutation is in flight

  const handleBookmark = () => {
    if (toggleBookmark.isPending) return;
    toggleBookmark.mutate({ postId: id });
  };

  const handleLike = () => {
    if (toggleLike.isPending) return;
    toggleLike.mutate({ postId: id });
  };

  const handleRepost = () => {
    if (toggleRepost.isPending) return;
    toggleRepost.mutate({ postId: id });
  };

  // ── Derived Values ─────────────────────────────────────────────────────────
  const isOwnPost = session?.user?.id === author.id;

  // ── Follow State & Mutation ────────────────────────────────────────────────
  // Only relevant when viewing another user's post
  const [isFollowing, setIsFollowing] = useState(false);
  const { data: followStatus } = api.user.isFollowing.useQuery(
    { targetUserId: author.id },
    { enabled: !!session && !isOwnPost },   // skip query for own posts
  );
  // Sync local follow state with server response
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
    <article className="border-b border-neutral-800 px-4 py-3">
      {/* Reposted-by label — rendered above the avatar when someone the current user follows reposted this */}
      {repostedBy && (
        <div className="flex items-center gap-1 text-[13px] text-neutral-500 mb-2 pl-1">
          {/* Small green repost icon — matches X's following-tab style */}
          <Repeat2 size={14} className="text-green-500" />
          <span>
            {/* Display the reposter's name, falling back to @username */}
            @{repostedBy.username ?? repostedBy.name} reposted
          </span>
        </div>
      )}

      {/* Main row: avatar (left) + content (right) */}
      <div className="flex gap-3">
        {/* ── Avatar Column ─────────────────────────────────────────────────── */}
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
            // Fallback placeholder when user has no avatar image
            <div className="h-10 w-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-500">
              <User size={20} />
            </div>
          )}
        </div>

        {/* ── Content Column ────────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* ── Header Row: name, @username, timestamp, 3-dot menu ─────────── */}
          <div className="flex items-center gap-1 text-[15px]">
            {/* Author name — clicking navigates to their profile */}
            <button
              onClick={(e) => { e.stopPropagation(); router.push(`/profile/${author.username ?? ""}`); }}
              className="font-bold text-white leading-5 truncate max-w-[120px] sm:max-w-[200px] hover:underline text-left"
            >
              {author.name ?? "Unknown"}
            </button>
            {/* @username — muted secondary text */}
            <span className="text-neutral-500 truncate">@{author.username}</span>
            {/* Separator dot */}
            <span className="text-neutral-500 flex-shrink-0">·</span>
            {/* Relative timestamp (e.g. "5m", "2h") */}
            <span className="text-neutral-500 flex-shrink-0">{timeAgo(createdAt)}</span>

            {/* 3-dot menu — always visible, shows different options based on post ownership */}
            <PostMenu
              isOwnPost={isOwnPost}
              authorUsername={author.username ?? ""}
              authorId={author.id}
              isFollowing={isFollowing}
              toggleFollow={toggleFollow}
              onDelete={() => setShowDeleteConfirm(true)}
            />
          </div>

          {/* ── Body Text ───────────────────────────────────────────────────── */}
          <div className="text-[15px] text-white leading-normal whitespace-pre-wrap break-words mt-0.5">
            {renderContent(content, router)}
          </div>

          {/* ── Optional Image ──────────────────────────────────────────────── */}
          {imageUrl && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-neutral-700">
              <img
                src={imageUrl}
                alt="Post image"
                width={500}
                height={300}
                className="w-full max-h-80 object-cover"
              />
            </div>
          )}

          {/* ── Action Row ──────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mt-3 text-neutral-500 max-w-[425px] -ml-2">

            {/* Reply — opens the ReplyModal overlay */}
            <button
              onClick={(e) => { e.stopPropagation(); setShowReplyModal(true); }}
              className="group flex items-center gap-1.5 p-2 rounded-full transition-colors hover:text-[rgb(29,155,240)] cursor-pointer"
            >
              <span className="p-2 rounded-full group-hover:bg-[rgba(29,155,240,0.1)] transition-colors">
                <MessageCircle size={18} strokeWidth={1.5} />
              </span>
              {commentCount > 0 ? commentCount : <></>}
            </button>

            {/* Repost — optimistic toggle, green when active */}
            <button
              onClick={(e) => { e.stopPropagation(); handleRepost(); }}
              disabled={toggleRepost.isPending}
              className={`group flex items-center gap-1.5 p-2 rounded-full transition-colors cursor-pointer ${isReposted ? "text-[rgb(0,186,124)]" : "hover:text-[rgb(0,186,124)]"}`}
            >
              <span className={`p-2 rounded-full transition-colors ${isReposted ? "" : "group-hover:bg-[rgba(0,186,124,0.1)]"}`}>
                <Repeat2
                  size={18}
                  strokeWidth={1.5}
                  className={isReposted ? "fill-[rgb(0,186,124)]" : ""}
                />
              </span>
              {repostCount > 0 && (
                <span className={`text-sm -ml-1.5 ${isReposted ? "text-[rgb(0,186,124)]" : ""}`}>
                  {repostCount}
                </span>
              )}
            </button>

            {/* Like — optimistic toggle, pink when active */}
            <button
              onClick={(e) => { e.stopPropagation(); handleLike(); }}
              disabled={toggleLike.isPending}
              className={`group flex items-center gap-1.5 p-2 rounded-full transition-colors cursor-pointer ${isLiked ? "text-[rgb(249,24,128)]" : "hover:text-[rgb(249,24,128)]"}`}
            >
              <span className={`p-2 rounded-full transition-colors ${isLiked ? "" : "group-hover:bg-[rgba(249,24,128,0.1)]"}`}>
                <Heart
                  size={18}
                  strokeWidth={1.5}
                  className={isLiked ? "fill-[rgb(249,24,128)]" : ""}
                />
              </span>
              {likeCount > 0 && (
                <span className={`text-sm -ml-1.5 ${isLiked ? "text-[rgb(249,24,128)]" : ""}`}>
                  {likeCount}
                </span>
              )}
            </button>

            {/* Views — UI only (no backend tracking yet) */}
            <button className="group flex items-center gap-1.5 p-2 rounded-full transition-colors hover:text-[rgb(29,155,240)] cursor-pointer">
              <span className="p-2 rounded-full group-hover:bg-[rgba(29,155,240,0.1)] transition-colors">
                <BarChart2 size={18} strokeWidth={1.5} />
              </span>
            </button>

            {/* Bookmark + Share */}
            <div className="flex items-center">
              {/* Bookmark — optimistic toggle, X-blue when active */}
              <button
                onClick={(e) => { e.stopPropagation(); handleBookmark(); }}
                disabled={toggleBookmark.isPending}
                className={`group p-2 rounded-full transition-colors cursor-pointer ${isBookmarked ? "text-[rgb(29,155,240)]" : "hover:text-[rgb(29,155,240)]"}`}
              >
                <span className={`p-2 rounded-full transition-colors block ${isBookmarked ? "" : "group-hover:bg-[rgba(29,155,240,0.1)]"}`}>
                  <Bookmark size={18} strokeWidth={1.5} className={isBookmarked ? "fill-[rgb(29,155,240)]" : ""} />
                </span>
              </button>
              {/* Share — UI only (native share or copy link could be added) */}
              <button className="group p-2 rounded-full transition-colors hover:text-[rgb(29,155,240)] cursor-pointer">
                <span className="p-2 rounded-full group-hover:bg-[rgba(29,155,240,0.1)] transition-colors block">
                  <Upload size={18} strokeWidth={1.5} />
                </span>
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* ── Reply Modal (conditional) ────────────────────────────────────────── */}
      {
        showReplyModal && (
          <ReplyModal
            postId={id}
            authorName={author.name}
            authorUsername={author.username}
            authorImage={author.image}
            postContent={content}
            onClose={() => setShowReplyModal(false)}
          />
        )
      }

      {/* ── Delete Confirmation Modal ────────────────────────────────────────── */}
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
