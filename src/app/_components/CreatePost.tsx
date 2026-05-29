"use client";
import { useState } from "react";
import { api } from "~/trpc/react";

export default function CreatePost() {
  const [content, setContent] = useState("");
  const utils = api.useUtils();

  const createPost = api.post.create.useMutation({
    onSuccess: () => {
      setContent("");
      // Properly handle the promise from invalidate
      void utils.post.getAll.invalidate().catch((err) => {
        console.error("Failed to invalidate posts:", err);
      });
    },
    onError: (err) => {
      alert(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      createPost.mutate({ content });
    }
  };

  return (
    <div className="border-b p-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's happening?"
          rows={3}
          maxLength={280}
          className="w-full rounded-lg border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={createPost.isPending}
        />
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{content.length}/280</span>
          <button
            type="submit"
            disabled={!content.trim() || createPost.isPending}
            className="rounded-full bg-blue-500 px-4 py-2 text-white disabled:opacity-50"
          >
            {createPost.isPending ? "Posting..." : "Post"}
          </button>
        </div>
      </form>
    </div>
  );
}