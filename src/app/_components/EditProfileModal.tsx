"use client";
import { useState, useRef } from "react";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { X, Loader2, Camera } from "lucide-react";

interface EditProfileModalProps {
  onClose: () => void;
}

export default function EditProfileModal({ onClose }: EditProfileModalProps) {
  const { data: session, update: updateSession } = useSession();
  const { data: user, isLoading } = api.user.getByUsername.useQuery(
    { username: session?.user?.username ?? "" },
    { enabled: !!session?.user?.username }
  );

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "banner" | null>(null);
  const [uploadError, setUploadError] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  if (user && !initialized) {
    setName(user.name ?? "");
    setBio(user.bio ?? "");
    setImage(user.image ?? "");
    setBannerUrl(user.bannerUrl ?? "");
    setInitialized(true);
  }

  const utils = api.useUtils();
  const updateProfile = api.user.updateProfile.useMutation({
    onSuccess: async (data) => {
      await updateSession({ name: data.name, image: data.image });
      await utils.user.getByUsername.invalidate();
      onClose();
    },
  });

  const handleSave = () => {
    if (!name.trim() || updateProfile.isPending) return;
    updateProfile.mutate({
      name: name.trim(),
      bio: bio.trim() || undefined,
      image: image || null,
      bannerUrl: bannerUrl || null,
    });
  };

  const handleUpload = async (file: File, type: "avatar" | "banner") => {
    setUploadError("");
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
    if (data.url) {
      if (type === "avatar") setImage(data.url);
      else setBannerUrl(data.url);
    }
    setUploading(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/10"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-[600px] mt-12 mb-12">
        <div className="rounded-2xl border border-neutral-700 bg-black">
          {/* Header */}
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

          {/* Form */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-neutral-500" size={24} />
            </div>
          ) : (
            <>
              {uploadError && (
                <div className="px-4 pt-2">
                  <p className="text-red-500 text-sm">{uploadError}</p>
                </div>
              )}
              <div className="p-4 space-y-5">
              {/* Banner */}
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1.5">Banner image</label>
                <div className="relative h-32 bg-neutral-800 rounded-lg overflow-hidden flex items-center justify-center">
                  {bannerUrl ? (
                    <img src={bannerUrl} alt="Banner" className="object-cover" style={{ objectFit: "cover", width: "100%", height: "100%" }} />
                  ) : (
                    <span className="text-neutral-600 text-sm">No banner</span>
                  )}
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

              {/* Avatar */}
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1.5">Profile photo</label>
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 rounded-full bg-neutral-800 overflow-hidden flex-shrink-0">
                    {image ? (
                      <img src={image} alt="Avatar" className="object-cover" style={{ objectFit: "cover", width: "100%", height: "100%" }} />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-neutral-600">No photo</div>
                    )}
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

              {/* Name */}
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

              {/* Bio */}
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
