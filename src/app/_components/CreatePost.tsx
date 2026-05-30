/**
 * CreatePost — the post composer at the top of the feed.
 * Features:
 * - Textarea (280 char limit) with character counter
 * - Image upload: file picker → preview → uploads via POST /api/upload
 *   before the post is created, passes imageUrl to post.create
 * - Icon toolbar (media, GIF, poll, emoji, schedule, location — mostly UI only)
 * - Loading spinner overlay during upload/submit
 * - Invalidates feed + all-posts queries on success
 */
"use client";
import { useState, useRef } from "react";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Film, AlignLeft, Smile, Calendar, MapPin, User, Loader2, X } from "lucide-react";
import { renderContent } from "./renderContent";

export default function CreatePost() {
  const { data: session } = useSession();
  const [content, setContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();

  const createPost = api.post.create.useMutation({
    onSuccess: async () => {
      setContent("");
      setImageFile(null);
      setImagePreview(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !imageFile) return;
    setIsPosting(true);

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

    createPost.mutate({ content, imageUrl });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const router = useRouter();

  return (
    <div className="border-b border-neutral-800 p-4 flex gap-3">
      <div className="flex-shrink-0">
        {session?.user?.image ? (
          <img src={session.user.image} alt="Avatar" className="h-10 w-10 rounded-full object-cover" width={40} height={40} />
        ) : (
          <div className="h-10 w-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-500">
            <User size={24} />
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 pb-1">
        <div className="relative">
          {/* Mirror div for auto-height */}
          <div className="invisible whitespace-pre-wrap break-words text-xl pt-1 min-h-[60px]" aria-hidden>
            {content || "placeholder"}
          </div>
          {/* Overlay showing styled text */}
          <div className="absolute inset-0 pointer-events-none text-xl whitespace-pre-wrap break-words pt-1 text-white">
            {content ? renderContent(content, router) : <span className="text-neutral-500">What&apos;s happening?</span>}
          </div>
          {/* Actual input (transparent text, white caret) */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={280}
            className="absolute inset-0 w-full h-full bg-transparent text-xl resize-none pt-1 focus:outline-none caret-white text-transparent overflow-hidden"
            disabled={isPosting || uploading}
          />
        </div>

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

        <div className="flex justify-between items-center mt-3 pt-3 border-t border-neutral-800/50">
          <div className="flex gap-4" style={{ color: "rgb(29,155,240)" }}>
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
      {(isPosting || uploading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}
    </div>
  );
}
