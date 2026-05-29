"use client";
import { api } from "~/trpc/react";
import { useState } from "react";
import { Heart } from "lucide-react";

interface PostCardProps {
  id: string;
  content: string;
  author: { name: string | null; username: string | null; image: string | null };
  createdAt: Date;
  likedByUser: boolean;
  likeCount: number;
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
      // Cancel any ongoing refetches
      await utils.post.getAll.cancel();

      // Snapshot previous data (for rollback)
      const previousData = utils.post.getAll.getData();

      // Optimistically update UI using the current state values
      const newLiked = !isLiked;
      const newCount = newLiked ? likeCount + 1 : likeCount - 1;
      setIsLiked(newLiked);
      setLikeCount(newCount);

      // Return context for error rollback
      return { previousData, previousLiked: isLiked, previousCount: likeCount };
    },
    onError: (err, variables, context) => {
      // Rollback to previous state
      if (context?.previousLiked !== undefined) {
        setIsLiked(context.previousLiked);
        setLikeCount(context.previousCount);
      }
      console.error("Like toggle failed:", err);
    },
    onSettled: () => {
      // Refetch to ensure consistency (optional but safe)
      void utils.post.getAll.invalidate().catch(console.error);
    },
  });

  const handleLike = () => {
    // Prevent double-click while request is in flight
    if (toggleLike.isPending) return;
    toggleLike.mutate({ postId: id });
  };

  return (
    <div className="border-b p-4 hover:bg-gray-50 transition-colors">
      <div className="flex gap-3">
        <div className="h-10 w-10 rounded-full bg-gray-300 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold">{author.name ?? "Unknown"}</span>
            <span className="text-gray-500 text-sm">@{author.username}</span>
            <span className="text-gray-400 text-sm">
              {new Date(createdAt).toLocaleString()}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap">{content}</p>
          <div className="mt-3 flex items-center gap-4">
            <button
              onClick={handleLike}
              disabled={toggleLike.isPending}
              className={`flex items-center gap-1 transition ${
                isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"
              }`}
            >
              <Heart
                size={18}
                fill={isLiked ? "currentColor" : "none"}
                strokeWidth={1.5}
              />
              <span>{likeCount}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}