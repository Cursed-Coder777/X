/**
 * PostMenu — the 3-dot dropdown menu on each post card.
 *
 * Shows contextual actions:
 *   - Own post: red "Delete" button → opens ConfirmModal in PostCard
 *   - Other's post: "Follow @username" or "Unfollow @username" (toggles)
 *
 * Closes on click-outside via a mousedown listener on document.
 */
"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Trash2, UserPlus, UserMinus } from "lucide-react";

// ── Props ────────────────────────────────────────────────────────────────────
interface PostMenuProps {
  isOwnPost: boolean;                   // whether this post belongs to the logged-in user
  authorUsername: string;               // used for "Follow @username" / "Unfollow" text
  authorId: string;                     // passed to toggleFollow mutation
  isFollowing: boolean;                 // current follow state (fetched by PostCard)
  toggleFollow: {                        // mutation object from PostCard — we only call .mutate()
    mutate: (args: { targetUserId: string }) => void;
    isPending: boolean;
  };
  onDelete: () => void;                 // callback that opens ConfirmModal in the parent
}

export default function PostMenu({
  isOwnPost,
  authorUsername,
  authorId,
  isFollowing,
  toggleFollow,
  onDelete,
}: PostMenuProps) {
  // ── Menu open/close state ──────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  // Ref to the dropdown container so we can detect clicks outside
  const ref = useRef<HTMLDivElement>(null);

  // ── Click-outside handler ──────────────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      // If the click target is outside the menu wrapper, close it
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    // mousedown fires before click, giving a snappier close feel
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative ml-auto" ref={ref}>
      {/* 3-dot toggle button — X-blue hover ring, same style as action icons */}
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((prev) => !prev); }}
        className="p-1.5 rounded-full hover:bg-[rgba(29,155,240,0.1)] hover:text-[rgb(29,155,240)] transition-colors cursor-pointer"
      >
        <MoreHorizontal size={18} strokeWidth={1.5} />
      </button>

      {/* Dropdown — absolutely positioned below and right-aligned */}
      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-black border border-neutral-700 rounded-xl shadow-lg z-50 py-1">
          {isOwnPost ? (
            // ── Own post: red Delete button ──────────────────────────────────
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();             // triggers ConfirmModal in PostCard
                setOpen(false);
              }}
              className="flex items-center gap-3 w-full px-4 py-3 text-[15px] text-red-500 hover:bg-neutral-900 transition-colors cursor-pointer"
            >
              <Trash2 size={18} />
              Delete
            </button>
          ) : (
            // ── Other user's post: Follow / Unfollow toggle ──────────────────
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFollow.mutate({ targetUserId: authorId });
                setOpen(false);
              }}
              disabled={toggleFollow.isPending}
              className="flex items-center gap-3 w-full px-4 py-3 text-white font-bold text-xl hover:bg-neutral-900 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isFollowing ? (
                <>
                  <UserMinus size={20} />
                  Unfollow @{authorUsername}
                </>
              ) : (
                <>
                  <UserPlus size={20} />
                  Follow @{authorUsername}
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
