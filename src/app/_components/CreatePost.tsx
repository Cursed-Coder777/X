/**
 * CreatePost — the post composer component at the top of the feed.
 * Features:
 * - User avatar display (or fallback icon)
 * - Textarea with 280-char limit (X/Twitter style)
 * - Character counter
 * - Icon toolbar (media, GIF, poll, emoji, schedule, location — mostly UI only)
 * - "Post" submit button with loading spinner overlay
 * - Invalidates feed queries on successful post
 */
"use client";
import { useState } from "react";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { Image as ImageIcon, Film, AlignLeft, Smile, Calendar, MapPin, User, Loader2 } from "lucide-react";
import Image from "next/image";

export default function CreatePost() {
  const { data: session } = useSession();
  const [content, setContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const utils = api.useUtils();

  const createPost = api.post.create.useMutation({
    onSuccess: async () => {
      setContent("");
      await Promise.all([
        utils.post.getFeed.invalidate(),
        utils.post.getAll.invalidate(),
      ]).catch(console.error);
      setIsPosting(false);
    },
    onError: (err) => {
      setIsPosting(false);
      alert(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      setIsPosting(true);
      createPost.mutate({ content });
    }
  };

  return (
    <div className="border-b border-neutral-800 p-4 flex gap-3">
      <div className="flex-shrink-0">
        {session?.user?.image ? (
          <Image src={session.user.image} alt="Avatar" className="h-10 w-10 rounded-full object-cover" width={40} height={40} />
        ) : (
          <div className="h-10 w-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-500">
            <User size={24} />
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 pb-1">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's happening?"
          rows={2}
          maxLength={280}
          className="w-full bg-transparent text-xl placeholder-neutral-500 focus:outline-none resize-none pt-1 min-h-[60px]"
          disabled={isPosting}
        />
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-neutral-800/50">
          <div className="flex gap-4" style={{ color: "rgb(29,155,240)" }}>
            <button type="button" className="p-2 -ml-2 rounded-full transition-colors hover:bg-[rgba(29,155,240,0.1)]">
              <ImageIcon size={18} />
            </button>
            <button type="button" className="p-2 rounded-full transition-colors hover:bg-[rgba(29,155,240,0.1)]">
              <Film size={18} />
            </button>
            <button type="button" className="p-2 rounded-full transition-colors hover:bg-[rgba(29,155,240,0.1)] hidden sm:block">
              <AlignLeft size={18} />
            </button>
            <button type="button" className="p-2 rounded-full transition-colors hover:bg-[rgba(29,155,240,0.1)] hidden sm:block">
              <Smile size={18} />
            </button>
            <button type="button" className="p-2 rounded-full transition-colors hover:bg-[rgba(29,155,240,0.1)] hidden sm:block">
              <Calendar size={18} />
            </button>
            <button type="button" className="p-2 rounded-full transition-colors opacity-50 cursor-not-allowed hidden sm:block">
              <MapPin size={18} />
            </button>
          </div>
          <div className="flex items-center gap-4">
            {content.length > 0 && (
              <span className="text-sm text-gray-500 font-medium">{content.length}/280</span>
            )}
            <button
              type="submit"
              disabled={!content.trim() || isPosting}
              className="rounded-full px-4 py-1.5 font-bold text-white transition disabled:opacity-50"
              style={{ backgroundColor: "rgb(29,155,240)" }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = "rgb(26,140,216)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgb(29,155,240)";
              }}
            >
              Post
            </button>
          </div>
        </div>
      </form>
      {isPosting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}
    </div>
  );
}