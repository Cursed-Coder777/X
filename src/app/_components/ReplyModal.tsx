/**
 * ReplyModal — modal overlay for replying to a post.
 * Shows the original post context (author, avatar, content) with a
 * "Replying to @username" indicator and a textarea for the reply.
 * Submits via comment.create mutation, invalidates related queries on success.
 * Closes on backdrop click or X button. Shows character count.
 */
"use client";

// Local state for the reply textarea
import { useState } from "react";
// tRPC client for the comment.create mutation
import { api } from "~/trpc/react";
// UI icons: user fallback, loading spinner, close button
import { User, Loader2, X } from "lucide-react";
// Next.js optimized image for the author avatar
import Image from "next/image";

// Props: the original post's metadata and a close handler
interface ReplyModalProps {
  postId: string;
  authorName: string | null;
  authorUsername: string | null;
  authorImage: string | null;
  postContent: string;
  onClose: () => void;
}

export default function ReplyModal({
  postId,
  authorName,
  authorUsername,
  authorImage,
  postContent,
  onClose,
}: ReplyModalProps) {
  // Controlled reply text
  const [content, setContent] = useState("");
  // tRPC utility bag for cache invalidation
  const utils = api.useUtils();

  // Mutation: create a new comment (reply)
  const createComment = api.comment.create.useMutation({
    onSuccess: async () => {
      // Clear the input
      setContent("");
      // Invalidate comment and post caches so the UI refreshes
      await Promise.all([
        utils.comment.getByPost.invalidate({ postId }),
        utils.post.getFeed.invalidate(),
        utils.post.getAll.invalidate(),
      ]).catch(console.error);
      // Close the modal
      onClose();
    },
    onError: (err) => {
      alert(err.message);
    },
  });

  // Submit the reply
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      createComment.mutate({ postId, content });
    }
  };

  return (
    // Backdrop — clicking outside the modal card closes it
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal card */}
      <div className="bg-black border border-neutral-700 rounded-2xl w-full max-w-lg mx-4">
        {/* Header row with close (X) button */}
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-800 transition-colors"
          >
            <X size={20} className="text-neutral-500" />
          </button>
        </div>

        {/* Original post context: avatar + name/username + content */}
        <div className="flex gap-3 px-4 pb-3">
          <div className="flex-shrink-0">
            {authorImage ? (
              <Image
                src={authorImage}
                alt={authorName ?? "Avatar"}
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
              <span className="font-bold text-white">{authorName ?? "Unknown"}</span>
              <span className="text-neutral-500 truncate">@{authorUsername}</span>
            </div>
            <p className="text-[15px] text-white whitespace-pre-wrap break-words mt-0.5">
              {postContent}
            </p>
          </div>
        </div>

        {/* "Replying to @username" label in X-blue */}
        <div className="px-4 pb-2">
          <span className="text-sm text-neutral-500">
            Replying to <span className="text-[rgb(29,155,240)]">@{authorUsername}</span>
          </span>
        </div>

        {/* Reply textarea + character count + submit button */}
        <form onSubmit={handleSubmit} className="px-4 pb-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Post your reply"
            rows={3}
            maxLength={280}
            className="w-full bg-transparent text-xl text-white placeholder-neutral-500 focus:outline-none resize-none"
            autoFocus
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-neutral-500">{content.length}/280</span>
            <button
              type="submit"
              disabled={!content.trim() || createComment.isPending}
              className="rounded-full bg-white px-5 py-2 font-bold text-black transition hover:bg-neutral-200 disabled:opacity-50 flex items-center gap-2"
            >
              {createComment.isPending && <Loader2 size={16} className="animate-spin" />}
              Reply
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
