/**
 * EditProfileModal — modal for editing the user's profile.
 * Fields: banner image, avatar, display name, bio.
 * Images are uploaded to /api/upload (max 5 MB) before saving.
 * On save, updates the NextAuth session and invalidates the user query.
 * Closes on backdrop click or X button.
 */
"use client";

// React hooks for state and DOM refs
import { useState, useRef } from "react";
// tRPC client for fetching user data and the update mutation
import { api } from "~/trpc/react";
// NextAuth session for the current user's username + session update
import { useSession } from "next-auth/react";
// UI icons: close, spinner, camera overlay
import { X, Loader2, Camera } from "lucide-react";

interface EditProfileModalProps {
  onClose: () => void;
}

export default function EditProfileModal({ onClose }: EditProfileModalProps) {
  // Current session and the update callback to sync changed fields
  const { data: session, update: updateSession } = useSession();
  // Fetch the full user profile by username so we can pre-fill the form
  const { data: user, isLoading } = api.user.getByUsername.useQuery(
    { username: session?.user?.username ?? "" },
    { enabled: !!session?.user?.username }
  );

  // Controlled form fields
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  // Guard: only populate fields from fetched user once
  const [initialized, setInitialized] = useState(false);
  // Tracks which upload (if any) is in progress
  const [uploading, setUploading] = useState<"avatar" | "banner" | null>(null);
  // Upload error message displayed above the form
  const [uploadError, setUploadError] = useState("");
  // Refs to hidden file inputs for avatar and banner
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // One-time initialisation: copy fetched user data into local state
  if (user && !initialized) {
    setName(user.name ?? "");
    setBio(user.bio ?? "");
    setImage(user.image ?? "");
    setBannerUrl(user.bannerUrl ?? "");
    setInitialized(true);
  }

  // tRPC utility bag and update-profile mutation
  const utils = api.useUtils();
  const updateProfile = api.user.updateProfile.useMutation({
    onSuccess: async (data) => {
      // Sync the session so the UI shows the new name/avatar immediately
      await updateSession({ name: data.name, image: data.image });
      // Refetch the profile query
      await utils.user.getByUsername.invalidate();
      onClose();
    },
  });

  // Save handler — validates name is non-empty, then fires the mutation
  const handleSave = () => {
    if (!name.trim() || updateProfile.isPending) return;
    updateProfile.mutate({
      name: name.trim(),
      bio: bio.trim() || undefined,
      image: image || null,
      bannerUrl: bannerUrl || null,
    });
  };

  // Generic image upload — called for both avatar and banner
  const handleUpload = async (file: File, type: "avatar" | "banner") => {
    setUploadError("");
    // Reject files larger than 5 MB
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File too large — max 5 MB");
      return;
    }
    setUploading(type);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok) {
      setUploadError(data.error ?? "Upload failed");
      setUploading(null);
      return;
    }
    // Store the returned URL in the appropriate state field
    if (data.url) {
      if (type === "avatar") setImage(data.url);
      else setBannerUrl(data.url);
    }
    setUploading(null);
  };

  return (
    // Scrollable backdrop — clicking outside closes the modal
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-[600px] mt-8 mb-12 mx-4">
        <div className="rounded-2xl border border-neutral-700 bg-black">
          {/* Header: X close button, title, and Save button */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
            <div className="flex items-center gap-6">
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-neutral-900 transition-colors cursor-pointer"
              >
                <X size={20} className="text-white" />
              </button>
              <h2 className="text-lg font-bold text-white">Edit profile</h2>
            </div>
            <button
              onClick={handleSave}
              disabled={!name.trim() || updateProfile.isPending}
              className="bg-white text-black font-bold text-sm px-5 py-1.5 rounded-full hover:bg-neutral-200 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {updateProfile.isPending ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                "Save"
              )}
            </button>
          </div>

          {/* Form body or loading spinner */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-neutral-500" size={24} />
            </div>
          ) : (
            <>
              {/* Upload error banner */}
              {uploadError && (
                <div className="px-4 pt-2">
                  <p className="text-red-500 text-sm">{uploadError}</p>
                </div>
              )}
              <div className="p-4 space-y-5">
                {/* Banner image picker */}
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1.5">Banner image</label>
                  <div className="relative h-32 bg-neutral-800 rounded-lg overflow-hidden flex items-center justify-center">
                    {bannerUrl ? (
                      <img src={bannerUrl} alt="Banner" className="object-cover" style={{ objectFit: "cover", width: "100%", height: "100%" }} />
                    ) : (
                      <span className="text-neutral-600 text-sm">No banner</span>
                    )}
                    {/* Camera overlay on hover */}
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      disabled={uploading === "banner"}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
                    >
                      {uploading === "banner" ? (
                        <Loader2 className="animate-spin text-white" size={24} />
                      ) : (
                        <Camera size={24} className="text-white" />
                      )}
                    </button>
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f, "banner"); }}
                    />
                  </div>
                  <p className="text-neutral-500 text-xs mt-1">You can upload up to 5 MB</p>
                </div>

                {/* Avatar / profile photo picker */}
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1.5">Profile photo</label>
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 rounded-full bg-neutral-800 overflow-hidden flex-shrink-0">
                      {image ? (
                        <img src={image} alt="Avatar" className="object-cover" style={{ objectFit: "cover", width: "100%", height: "100%" }} />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-neutral-600">No photo</div>
                      )}
                      {/* Camera overlay on hover */}
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={uploading === "avatar"}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-full"
                      >
                        {uploading === "avatar" ? (
                          <Loader2 className="animate-spin text-white" size={20} />
                        ) : (
                          <Camera size={20} className="text-white" />
                        )}
                      </button>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f, "avatar"); }}
                      />
                    </div>
                    <span className="text-neutral-500 text-sm">Click to upload a photo</span>
                  </div>
                  <p className="text-neutral-500 text-xs mt-1">You can upload up to 5 MB</p>
                </div>

                {/* Display name text input */}
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1.5">Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={50}
                    className="w-full bg-black text-white border border-neutral-700 rounded-md px-3 py-2 text-[15px] outline-none focus:border-[rgb(29,155,240)] focus:ring-1 focus:ring-[rgb(29,155,240)] placeholder-neutral-600"
                  />
                  <span className="text-neutral-500 text-xs mt-1 block text-right">{name.length}/50</span>
                </div>

                {/* Bio textarea */}
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1.5">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={160}
                    rows={3}
                    className="w-full bg-black text-white border border-neutral-700 rounded-md px-3 py-2 text-[15px] outline-none focus:border-[rgb(29,155,240)] focus:ring-1 focus:ring-[rgb(29,155,240)] placeholder-neutral-600 resize-none"
                  />
                  <span className="text-neutral-500 text-xs mt-1 block text-right">{bio.length}/160</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
