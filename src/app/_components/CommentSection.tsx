/**
 * CommentSection — comment input form + comment list for a post.
 * Fetches comments via comment.getByPost, allows creating new replies
 * via comment.create mutation. On successful reply, invalidates comment
 * and post queries to refresh the UI.
 * Shows loading, empty, and error states.
 */
"use client";
import { useState } from "react";
import { api } from "~/trpc/react";
import CommentCard from "./CommentCard";

export default function CommentSection({ postId }: { postId: string }) {
  const utils = api.useUtils();
  const [content, setContent] = useState("");

  const { data: comments, isLoading } = api.comment.getByPost.useQuery({ postId });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      createComment.mutate({ postId, content });
    }
  };

  return (
    <div className="border-t border-neutral-800">
      {/* Comment input */}
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
          className="rounded-full bg-white px-4 py-1 text-sm font-bold text-black transition hover:bg-neutral-200 disabled:opacity-50"
        >
          Reply
        </button>
      </form>

      {/* Comments list */}
      {isLoading && <div className="px-4 py-3 text-sm text-neutral-500">Loading replies...</div>}
      {comments?.map((comment) => (
        <CommentCard key={comment.id} {...comment} />
      ))}
      {comments?.length === 0 && !isLoading && (
        <div className="px-4 py-3 text-sm text-neutral-500">No replies yet.</div>
      )}
    </div>
  );
}
