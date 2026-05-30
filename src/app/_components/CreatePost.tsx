/**
 * CreatePost — the post composer at the top of the feed.
 * Features:
 * - Textarea (280 char limit) with character counter
 * - Image upload: file picker -> preview -> uploads via POST /api/upload
 *   before the post is created, passes imageUrl to post.create
 * - Icon toolbar (media, GIF, poll, emoji, schedule, location — mostly UI only)
 * - Loading spinner overlay during upload/submit
 * - Invalidates feed + all-posts queries on success
 */
"use client";

// React hooks for local state and DOM refs
import { useState, useRef } from "react";
// tRPC client for invoking the post.create mutation
import { api } from "~/trpc/react";
// NextAuth session to show the current user's avatar
import { useSession } from "next-auth/react";
// Router for use inside renderContent (hashtag/profile navigation)
import { useRouter } from "next/navigation";
// Toolbar icons and loading/close indicators
import { Image as ImageIcon, Film, AlignLeft, Smile, Calendar, MapPin, User, Loader2, X } from "lucide-react";
// Helper that renders hashtags, mentions, and URLs as clickable elements
import { renderContent } from "./renderContent";

export default function CreatePost() {
  // Grab the current session to display the user's avatar
  const { data: session } = useSession();
  // Controlled textarea value
  const [content, setContent] = useState("");
  // Disable interactions while the post is being created
  const [isPosting, setIsPosting] = useState(false);
  // Raw File object selected by the user
  const [imageFile, setImageFile] = useState<File | null>(null);
  // Blob URL for previewing the selected image
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  // True while the image is being uploaded to /api/upload
  const [uploading, setUploading] = useState(false);
  // Ref to the hidden <input type="file"> for triggering the picker
  const fileInputRef = useRef<HTMLInputElement>(null);
  // tRPC utility bag for cache invalidation
  const utils = api.useUtils();

  // Mutation: create a new post
  const createPost = api.post.create.useMutation({
    onSuccess: async () => {
      // Clear the form fields
      setContent("");
      setImageFile(null);
      setImagePreview(null);
      // Invalidate both the feed and the "all posts" query so the UI refreshes
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

  // Called when the user hits "Post"
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Nothing to post — bail out
    if (!content.trim() && !imageFile) return;
    setIsPosting(true);

    // If an image was attached, upload it first and get the URL
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

    // Fire the mutation with content and optional image URL
    createPost.mutate({ content, imageUrl });
  };

  // Handle image file selection from the file picker
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    // Create a local blob URL for instant preview
    setImagePreview(URL.createObjectURL(file));
  };

  // Remove the selected image and reset the file input
  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const router = useRouter();

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

      {/* Post form */}
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 pb-1">
        {/* Auto-height textarea trick: mirror div + transparent textarea */}
        <div className="relative">
          {/* Invisible mirror that preserves whitespace and forces the container height */}
          <div className="invisible whitespace-pre-wrap break-words text-xl pt-1 min-h-[60px]" aria-hidden>
            {content || "placeholder"}
          </div>
          {/* Visible overlay renders hashtags/mentions as styled spans */}
          <div className="absolute inset-0 pointer-events-none text-xl whitespace-pre-wrap break-words pt-1 text-white">
            {content ? renderContent(content, router) : <span className="text-neutral-500">What&apos;s happening?</span>}
          </div>
          {/* Actual textarea — transparent text so the overlay shows through, white caret */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={280}
            className="absolute inset-0 w-full h-full bg-transparent text-xl resize-none pt-1 focus:outline-none caret-white text-transparent overflow-hidden"
            disabled={isPosting || uploading}
          />
        </div>

        {/* Image preview with remove button */}
        {imagePreview && (
          <div className="relative mt-2 rounded-2xl overflow-hidden border border-neutral-700">
            <img src={imagePreview} alt="Preview" width={500} height={300} className="w-full max-h-64 object-cover" />
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-2 left-2 p-1.5 rounded-full bg-black/70 hover:bg-black/90 transition-colors"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        )}

        {/* Toolbar + submit row */}
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-neutral-800/50">
          {/* Icon toolbar (X-blue colour) */}
          <div className="flex gap-4" style={{ color: "rgb(29,155,240)" }}>
            {/* Hidden file input triggered by the image button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 -ml-2 rounded-full transition-colors hover:bg-[rgba(29,155,240,0.1)] cursor-pointer"
            >
              <ImageIcon size={18} />
            </button>
            <button type="button" className="p-2 rounded-full transition-colors hover:bg-[rgba(29,155,240,0.1)] cursor-pointer">
              <Film size={18} />
            </button>
            <button type="button" className="p-2 rounded-full transition-colors hover:bg-[rgba(29,155,240,0.1)] cursor-pointer hidden sm:block">
              <AlignLeft size={18} />
            </button>
            <button type="button" className="p-2 rounded-full transition-colors hover:bg-[rgba(29,155,240,0.1)] cursor-pointer hidden sm:block">
              <Smile size={18} />
            </button>
            <button type="button" className="p-2 rounded-full transition-colors hover:bg-[rgba(29,155,240,0.1)] cursor-pointer  hidden sm:block">
              <Calendar size={18} />
            </button>
            <button type="button" className="p-2 rounded-full transition-colors opacity-50 cursor-not-allowed hidden sm:block">
              <MapPin size={18} />
            </button>
          </div>

          {/* Character count + submit button */}
          <div className="flex items-center gap-4">
            {content.length > 0 && (
              <span className="text-sm text-gray-500 font-medium">{content.length}/280</span>
            )}
            <button
              type="submit"
              disabled={(!content.trim() && !imageFile) || isPosting || uploading}
              className="rounded-full px-4 py-2 sm:py-1.5 font-bold text-white transition disabled:opacity-50"
              style={{ backgroundColor: "rgb(29,155,240)" }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = "rgb(26,140,216)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgb(29,155,240)";
              }}
            >
              {uploading ? "Uploading..." : "Post"}
            </button>
          </div>
        </div>
      </form>

      {/* Full-screen loading spinner during post or image upload */}
      {(isPosting || uploading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}
    </div>
  );
}
