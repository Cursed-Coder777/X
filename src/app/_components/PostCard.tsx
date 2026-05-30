/**
 * PostCard — a post in the feed.
 * Layout (flex-col inside a flex-row):
 *   Avatar (left) | [Header: name @username · time]
 *                  | [Body: content text]
 *                  | [Image: optional, rendered when imageUrl present]
 *                  | [Action row: reply, repost, like, views, bookmark, share]
 *
 * Actions:
 * - Reply: opens ReplyModal
 * - Repost: UI only (backend ready, need onClick wiring)
 * - Like: optimistic toggle with rollback
 * - Bookmark: optimistic toggle with rollback
 * - Views/Share: UI only (no backend)
 */
"use client";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { MessageCircle, Repeat2, Heart, BarChart2, Bookmark, Upload, User, MoreHorizontal, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import ReplyModal from "./ReplyModal";
import ConfirmModal from "./ConfirmModal";
import { renderContent } from "./renderContent";

interface PostCardProps {
  id: string;
  content: string;
  imageUrl?: string | null;
  author: { id: string; name: string | null; username: string | null; image: string | null };
  createdAt: Date;
  likedByUser: boolean;
  likeCount: number;
  commentCount?: number;
  bookmarkedByUser?: boolean;
}

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

export default function PostCard({
  id,
  content,
  imageUrl,
  author,
  createdAt,
  likedByUser: initialLiked,
  likeCount: initialCount,
  commentCount = 0,
  bookmarkedByUser: initialBookmarked = false,
}: PostCardProps) {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const utils = api.useUtils();
  const toggleLike = api.post.toggleLike.useMutation({
    onMutate: async () => {
      await utils.post.getAll.cancel();
      const previousData = utils.post.getAll.getData();
      const newLiked = !isLiked;
      setIsLiked(newLiked);
      setLikeCount((c) => (newLiked ? c + 1 : c - 1));
      return { previousData, previousLiked: isLiked, previousCount: likeCount };
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

  const { data: session } = useSession();
  const deletePost = api.post.delete.useMutation({
    onSuccess: () => {
      void utils.post.getAll.invalidate().catch(console.error);
      void utils.post.getFeed.invalidate().catch(console.error);
      void utils.post.getBookmarkedPosts.invalidate().catch(console.error);
      void utils.user.getUserPosts.invalidate().catch(console.error);
    },
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const router = useRouter();

  const handleBookmark = () => {
    if (toggleBookmark.isPending) return;
    toggleBookmark.mutate({ postId: id });
  };

  const handleLike = () => {
    if (toggleLike.isPending) return;
    toggleLike.mutate({ postId: id });
  };

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

  return (
    <article className="border-b border-neutral-800 px-4 py-3 flex gap-3">
      {/* Avatar */}
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

      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
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

          <div className="relative ml-auto" ref={menuRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen((prev) => !prev); }}
                className="p-1.5 rounded-full hover:bg-[rgba(29,155,240,0.1)] hover:text-[rgb(29,155,240)] transition-colors cursor-pointer"
              >
                <MoreHorizontal size={18} strokeWidth={1.5} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-black border border-neutral-700 rounded-xl shadow-lg z-50 py-1">
                  {isOwnPost ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(true);
                        setMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-[15px] text-red-500 hover:bg-neutral-900 transition-colors cursor-pointer"
                    >
                      <Trash2 size={18} />
                      Delete
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFollow.mutate({ targetUserId: author.id });
                        setMenuOpen(false);
                      }}
                      disabled={toggleFollow.isPending}
                      className="flex items-center gap-3 w-full px-4 py-3 text-[15px] text-white hover:bg-neutral-900 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isFollowing ? "Unfollow" : `Follow @${author.username}`}
                    </button>
                  )}
                </div>
              )}
            </div>
        </div>

        {/* Body */}
        <div className="text-[15px] text-white leading-normal whitespace-pre-wrap break-words mt-0.5">
          {renderContent(content, router)}
        </div>

        {/* Image */}
        {imageUrl && (
          <div className="mt-3 rounded-2xl overflow-hidden border border-neutral-700">
            <img src={imageUrl} alt="Post image" width={500} height={300} className="w-full max-h-80 object-cover" />
          </div>
        )}

        {/* Action Row */}
        <div className="flex items-center justify-between mt-3 text-neutral-500 max-w-[425px] -ml-2">

          {/* Reply icon — opens modal */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowReplyModal(true); }}
            className="group flex items-center gap-1.5 p-2 rounded-full transition-colors hover:text-[rgb(29,155,240)] cursor-pointer"
          >
            <span className="p-2 rounded-full group-hover:bg-[rgba(29,155,240,0.1)] transition-colors">
              <MessageCircle size={18} strokeWidth={1.5} />
            </span>
            {commentCount > 0 ? commentCount : <></>}
          </button>

          {/* Repost — green on hover */}
          <button className="group flex items-center gap-1.5 p-2 rounded-full transition-colors hover:text-[rgb(0,186,124)] cursor-pointer">
            <span className="p-2 rounded-full group-hover:bg-[rgba(0,186,124,0.1)] transition-colors">
              <Repeat2 size={18} strokeWidth={1.5} />
            </span>
          </button>

          {/* Like — pink on hover */}
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

          {/* Views — X blue on hover */}
          <button className="group flex items-center gap-1.5 p-2 rounded-full transition-colors hover:text-[rgb(29,155,240)] cursor-pointer">
            <span className="p-2 rounded-full group-hover:bg-[rgba(29,155,240,0.1)] transition-colors">
              <BarChart2 size={18} strokeWidth={1.5} />
            </span>
          </button>

          {/* Bookmark + Share — X blue on hover */}
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
            <button className="group p-2 rounded-full transition-colors hover:text-[rgb(29,155,240)] cursor-pointer">
              <span className="p-2 rounded-full group-hover:bg-[rgba(29,155,240,0.1)] transition-colors block">
                <Upload size={18} strokeWidth={1.5} />
              </span>
            </button>
          </div>

        </div>
      </div>

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