/**
 * CreatePost — the post composer component displayed at the top of the feed.
 *
 * Features:
 *   - Text input (280 char max) with highlighted hashtags/mentions/URLs
 *   - Image upload (via /api/upload, then attaches the returned URL)
 *   - GIF selector (preview grid of sample GIFs)
 *   - Poll creator (2–4 options, optional multi-vote)
 *   - Emoji picker (pop-up grid)
 *   - Character counter
 *   - Loading/uploading overlay
 *   - Invalidates feed caches on successful post
 *
 * The composer uses a ghost textarea technique: a transparent <textarea> sits
 * on top of a rendered-content <div>, so users see styled hashtags/mentions
 * while typing, yet can still edit naturally in the textarea.
 */

"use client";

// React hooks for state management and DOM refs
import { useState, useRef } from "react";
// tRPC client for the create mutation and cache invalidation
import { api } from "~/trpc/react";
// NextAuth session for the current user's avatar
import { useSession } from "next-auth/react";
// Router for navigation
import { useRouter } from "next/navigation";
// UI icons for the toolbar buttons
import { Image as ImageIcon, Calendar, MapPin, User, Loader2, X, BarChart3 } from "lucide-react";
// Content renderer — styles hashtags/mentions/URLs in the ghost overlay
import { renderContent } from "./renderContent";
// Sub-pickers
import EmojiPicker from "./EmojiPicker";
import GifPicker from "./GifPicker";
import PollCreator from "./PollCreator";

export default function CreatePost() {
  // ── Session ───────────────────────────────────────────────────────────────
  const { data: session } = useSession();

  // ── Form State ────────────────────────────────────────────────────────────
  const [content, setContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[] | null>(null);
  const [pollMaxVotes, setPollMaxVotes] = useState(1);
  const [showPoll, setShowPoll] = useState(false);

  // ── DOM Refs ──────────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── tRPC ──────────────────────────────────────────────────────────────────
  const utils = api.useUtils();
  const router = useRouter();

  // ── Create Post Mutation ──────────────────────────────────────────────────
  const createPost = api.post.create.useMutation({
    onSuccess: async () => {
      // Reset all form fields
      setContent("");
      setImageFile(null);
      setImagePreview(null);
      setGifUrl(null);
      setPollOptions(null);
      setPollMaxVotes(1);
      setShowPoll(false);
      // Invalidate feed caches to show the new post immediately
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

  // ── Submit Handler ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !imageFile && !gifUrl) return;
    setIsPosting(true);

    // Upload image first (if any), then create the post with the returned URL
    let imageUrl: string | undefined;
    if (imageFile) {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", imageFile);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = (await res.json()) as { url?: string };
      if (data.url) imageUrl = data.url;
      setUploading(false);
    }

    createPost.mutate({
      content,
      imageUrl,
      gifUrl: gifUrl ?? undefined,
      pollOptions: pollOptions ?? undefined,
      pollMaxVotes: pollOptions ? pollMaxVotes : undefined,
    });
  };

  // ── Image Selection ───────────────────────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setGifUrl(null);                // GIF and image are mutually exclusive
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Emoji Insertion ──────────────────────────────────────────────────────
  const handleEmojiSelect = (emoji: string) => {
    const ta = textareaRef.current;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newContent = content.slice(0, start) + emoji + content.slice(end);
      setContent(newContent);
      // Restore cursor position after the inserted emoji
      requestAnimationFrame(() => {
        ta.focus();
        ta.selectionStart = ta.selectionEnd = start + emoji.length;
      });
    } else {
      setContent((prev) => prev + emoji);
    }
  };

  // ── GIF Selection ────────────────────────────────────────────────────────
  const handleGifSelect = (url: string) => {
    setGifUrl(url);
    setImageFile(null);
    setImagePreview(null);          // GIF and image are mutually exclusive
  };

  // ── Poll Change ──────────────────────────────────────────────────────────
  const handlePollChange = (poll: { options: string[]; maxVotes: number } | null) => {
    setPollOptions(poll?.options ?? null);
    setPollMaxVotes(poll?.maxVotes ?? 1);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="border-b border-neutral-800 p-4 flex gap-3">
      {/* User avatar */}
      <div className="flex-shrink-0">
        {session?.user?.image ? (
          <img src={session.user.image} alt="Avatar" className="h-10 w-10 rounded-full object-cover" width={40} height={40} />
        ) : (
          <div className="h-10 w-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-500">
            <User size={24} />
          </div>
        )}
      </div>

      {/* Composer form */}
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 pb-1">
        {/* Ghost textarea: invisible textarea overlaid on rendered preview */}
        <div className="relative">
          <div className="invisible whitespace-pre-wrap break-words text-xl pt-1 min-h-[60px]" aria-hidden>
            {content || "placeholder"}
          </div>
          <div className="absolute inset-0 pointer-events-none text-xl whitespace-pre-wrap break-words pt-1 text-white">
            {content ? renderContent(content, router) : <span className="text-neutral-500">What&apos;s happening?</span>}
          </div>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={280}
            className="absolute inset-0 w-full h-full bg-transparent text-xl resize-none pt-1 focus:outline-none caret-white text-transparent overflow-hidden"
            disabled={isPosting || uploading}
          />
        </div>

        {/* Image preview */}
        {imagePreview && (
          <div className="relative mt-2 rounded-2xl overflow-hidden border border-neutral-700">
            <img src={imagePreview} alt="Preview" width={500} height={300} className="w-full max-h-64 object-cover" />
            <button type="button" onClick={removeImage} className="absolute top-2 left-2 p-1.5 rounded-full bg-black/70 hover:bg-black/90 transition-colors">
              <X size={16} className="text-white" />
            </button>
          </div>
        )}

        {/* GIF preview */}
        {gifUrl && (
          <div className="relative mt-2 rounded-2xl overflow-hidden border border-neutral-700">
            <img src={gifUrl} alt="GIF preview" width={500} height={300} className="w-full max-h-64 object-cover" />
            <button type="button" onClick={() => setGifUrl(null)} className="absolute top-2 left-2 p-1.5 rounded-full bg-black/70 hover:bg-black/90 transition-colors">
              <X size={16} className="text-white" />
            </button>
          </div>
        )}

        {/* Poll creator */}
        {showPoll && <PollCreator onPollChange={handlePollChange} />}

        {/* Toolbar + submit */}
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-neutral-800/50">
          <div className="flex gap-4" style={{ color: "rgb(29,155,240)" }}>
            {/* Image upload */}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 -ml-2 rounded-full transition-colors hover:bg-[rgba(29,155,240,0.1)] cursor-pointer">
              <ImageIcon size={18} />
            </button>
            {/* GIF picker */}
            <GifPicker onSelect={handleGifSelect} />
            {/* Poll toggle */}
            <button
              type="button"
              onClick={() => { setShowPoll(!showPoll); if (!showPoll) { setGifUrl(null); setImageFile(null); setImagePreview(null); } }}
              className={`p-2 rounded-full transition-colors cursor-pointer ${showPoll ? "bg-[rgba(29,155,240,0.1)]" : "hover:bg-[rgba(29,155,240,0.1)]"}`}
            >
              <BarChart3 size={18} />
            </button>
            {/* Emoji picker */}
            <EmojiPicker onSelect={handleEmojiSelect} />
            {/* Schedule (placeholder) */}
            <button type="button" className="p-2 rounded-full transition-colors hover:bg-[rgba(29,155,240,0.1)] cursor-pointer hidden sm:block">
              <Calendar size={18} />
            </button>
            {/* Location (placeholder) */}
            <button type="button" className="p-2 rounded-full transition-colors opacity-50 cursor-not-allowed hidden sm:block">
              <MapPin size={18} />
            </button>
          </div>

          {/* Character count + submit button */}
          <div className="flex items-center gap-4">
            {content.length > 0 && <span className="text-sm text-gray-500 font-medium">{content.length}/280</span>}
            <button
              type="submit"
              disabled={(!content.trim() && !imageFile && !gifUrl) || isPosting || uploading}
              className="rounded-full px-4 py-2 sm:py-1.5 font-bold text-white transition disabled:opacity-50"
              style={{ backgroundColor: "rgb(29,155,240)" }}
              onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = "rgb(26,140,216)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgb(29,155,240)"; }}
            >
              {uploading ? "Uploading..." : "Post"}
            </button>
          </div>
        </div>
      </form>

      {/* Full-screen uploading overlay */}
      {(isPosting || uploading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}
    </div>
  );
}
