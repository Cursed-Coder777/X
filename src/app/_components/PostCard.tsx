"use client";
import { api } from "~/trpc/react";
import { useState } from "react";
import { MessageCircle, Repeat2, Heart, BarChart2, Bookmark, Upload, User } from "lucide-react";
import Image from "next/image";

interface PostCardProps {
  id: string;
  content: string;
  author: { name: string | null; username: string | null; image: string | null };
  createdAt: Date;
  likedByUser: boolean;
  likeCount: number;
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
  author,
  createdAt,
  likedByUser: initialLiked,
  likeCount: initialCount,
}: PostCardProps) {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);
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

  const handleLike = () => {
    if (toggleLike.isPending) return;
    toggleLike.mutate({ postId: id });
  };

  return (
    <article className="border-b border-neutral-800 px-4 py-3 flex gap-3">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {author.image ? (
          <Image
            src={author.image}
            alt={author.name ?? "Avatar"}
            className="h-10 w-10 rounded-full object-cover"
            width={40}
            height={40}
            priority
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-500">
            <User size={20} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-1 text-[15px]">
          <span className="font-bold text-white leading-5 truncate max-w-[120px]">
            {author.name ?? "Unknown"}
          </span>
          <span className="text-neutral-500 truncate">@{author.username}</span>
          <span className="text-neutral-500 flex-shrink-0">·</span>
          <span className="text-neutral-500 flex-shrink-0">{timeAgo(createdAt)}</span>
        </div>

        {/* Body */}
        <p className="text-[15px] text-white leading-normal whitespace-pre-wrap break-words mt-0.5">
          {content}
        </p>

        {/* Action Row */}
        <div className="flex items-center justify-between mt-3 text-neutral-500 max-w-[425px] -ml-2">

          {/* Reply — X blue on hover */}
          <button className="group flex items-center gap-1.5 p-2 rounded-full transition-colors hover:text-[rgb(29,155,240)] cursor-pointer">
            <span className="p-2 rounded-full group-hover:bg-[rgba(29,155,240,0.1)] transition-colors">
              <MessageCircle size={18} strokeWidth={1.5} />
            </span>
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
            <button className="group p-2 rounded-full transition-colors hover:text-[rgb(29,155,240)] cursor-pointer">
              <span className="p-2 rounded-full group-hover:bg-[rgba(29,155,240,0.1)] transition-colors block">
                <Bookmark size={18} strokeWidth={1.5} />
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
    </article>
  );
}