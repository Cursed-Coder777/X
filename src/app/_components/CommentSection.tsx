/**
 * CommentSection — comment input form + threaded comment tree for a post.
 *
 * Features:
 *   - Top-level comment input box at the top
 *   - Inline reply form (appears when user clicks "Reply" on a comment)
 *   - Renders the threaded comment tree via CommentCard
 *   - Loading, empty, and error states
 *   - Invalidates both comment and feed caches on successful post
 */

"use client";

// React hook for state management
import { useState } from "react";
// tRPC client for comment queries and mutations
import { api } from "~/trpc/react";
// Recursive comment tree component
import CommentCard from "./CommentCard";

export default function CommentSection({ postId }: { postId: string }) {
  // tRPC utility bag for cache invalidation
  const utils = api.useUtils();

  // Top-level comment input state
  const [content, setContent] = useState("");

  // Inline reply state — tracks which comment we're replying to
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; username: string } | null>(null);
  const [replyContent, setReplyContent] = useState("");

  // ── Queries ───────────────────────────────────────────────────────────────
  // Fetch all comments for this post as a tree structure
  const { data: comments, isLoading } = api.comment.getByPost.useQuery({ postId });

  // ── Mutations ─────────────────────────────────────────────────────────────
  // Create a top-level comment
  const createComment = api.comment.create.useMutation({
    onSuccess: async () => {
      setContent("");
      await Promise.all([
        utils.comment.getByPost.invalidate({ postId }),
        utils.post.getFeed.invalidate(),
        utils.post.getAll.invalidate(),
      ]).catch(console.error);
    },
    onError: (err) => {
      alert(err.message);
    },
  });

  // Create a reply (nested comment with parentId)
  const createReply = api.comment.create.useMutation({
    onSuccess: async () => {
      setReplyContent("");
      setReplyingTo(null);
      await Promise.all([
        utils.comment.getByPost.invalidate({ postId }),
        utils.post.getFeed.invalidate(),
        utils.post.getAll.invalidate(),
      ]).catch(console.error);
    },
    onError: (err) => {
      alert(err.message);
    },
  });

  // ── Event Handlers ────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      createComment.mutate({ postId, content });
    }
  };

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (replyContent.trim() && replyingTo) {
      createReply.mutate({ postId, content: replyContent, parentId: replyingTo.commentId });
    }
  };

  const handleReply = (commentId: string, username: string) => {
    setReplyingTo({ commentId, username });
    setReplyContent("");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="border-t border-neutral-800">
      {/* Top-level comment input */}
      <form onSubmit={handleSubmit} className="flex gap-3 px-4 py-3">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Post your reply"
          maxLength={280}
          className="flex-1 bg-transparent text-[15px] text-white placeholder-neutral-500 focus:outline-none"
          disabled={createComment.isPending}
        />
        <button
          type="submit"
          disabled={!content.trim() || createComment.isPending}
          className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-neutral-200 disabled:opacity-50"
        >
          Reply
        </button>
      </form>

      {/* Inline reply form (shown when replying to a specific comment) */}
      {replyingTo && (
        <div className="border-t border-neutral-800 px-4 py-3 bg-neutral-900/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-neutral-500">
              Replying to <span className="text-[rgb(29,155,240)]">@{replyingTo.username}</span>
            </span>
            <button onClick={() => setReplyingTo(null)} className="text-neutral-500 hover:text-white text-sm">
              Cancel
            </button>
          </div>
          <form onSubmit={handleReplySubmit} className="flex gap-3">
            <input
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Post your reply"
              maxLength={280}
              autoFocus
              className="flex-1 bg-transparent text-[15px] text-white placeholder-neutral-500 focus:outline-none"
              disabled={createReply.isPending}
            />
            <button
              type="submit"
              disabled={!replyContent.trim() || createReply.isPending}
              className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-neutral-200 disabled:opacity-50"
            >
              Reply
            </button>
          </form>
        </div>
      )}

      {/* Comment tree */}
      {isLoading && <div className="px-4 py-3 text-sm text-neutral-500">Loading replies...</div>}
      {comments?.map((comment) => (
        <CommentCard key={comment.id} comment={comment} onReply={handleReply} />
      ))}
      {comments?.length === 0 && !isLoading && (
        <div className="px-4 py-3 text-sm text-neutral-500">No replies yet.</div>
      )}
    </div>
  );
}
