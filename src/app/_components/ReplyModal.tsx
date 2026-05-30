/**
 * ReplyModal — modal overlay for replying to a post.
 * Shows the original post context (author, avatar, content) with a
 * "Replying to @username" indicator and a textarea for the reply.
 * Submits via comment.create mutation, invalidates related queries on success.
 * Closes on backdrop click or X button. Shows character count.
 */
"use client";
import { useState } from "react";
import { api } from "~/trpc/react";
import { User, Loader2, X } from "lucide-react";
import Image from "next/image";

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
  const [content, setContent] = useState("");
  const utils = api.useUtils();

  const createComment = api.comment.create.useMutation({
    onSuccess: async () => {
      setContent("");
      await Promise.all([
        utils.comment.getByPost.invalidate({ postId }),
        utils.post.getFeed.invalidate(),
        utils.post.getAll.invalidate(),
      ]).catch(console.error);
      onClose();
    },
    onError: (err) => {
      alert(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      createComment.mutate({ postId, content });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-black border border-neutral-700 rounded-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-800 transition-colors"
          >
            <X size={20} className="text-neutral-500" />
          </button>
        </div>

        {/* Original post context */}
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

        {/* Replying to indicator */}
        <div className="px-4 pb-2">
          <span className="text-sm text-neutral-500">
            Replying to <span className="text-[rgb(29,155,240)]">@{authorUsername}</span>
          </span>
        </div>

        {/* Reply input */}
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
