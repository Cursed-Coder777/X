/**
 * PostMenu — the 3-dot dropdown menu on each PostCard.
 *
 * Shows contextual actions depending on whether the post belongs to
 * the current user:
 *   - Own post:  red "Delete" button (triggers ConfirmModal in PostCard)
 *   - Other's:   "Follow @username" or "Unfollow @username" toggle
 *
 * Closes on click-outside via a mousedown listener on the document.
 *
 * Props:
 *   isOwnPost     — whether this post belongs to the logged-in user
 *   authorUsername — used for "Follow @username" button text
 *   authorId      — passed to toggleFollow mutation
 *   isFollowing   — current follow state
 *   toggleFollow  — mutation object (we only call .mutate())
 *   onDelete      — callback to open ConfirmModal in the parent (PostCard)
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Trash2, UserPlus, UserMinus } from "lucide-react";

interface PostMenuProps {
  isOwnPost: boolean;
  authorUsername: string;
  authorId: string;
  isFollowing: boolean;
  toggleFollow: {
    mutate: (args: { targetUserId: string }) => void;
    isPending: boolean;
  };
  onDelete: () => void;
}

export default function PostMenu({
  isOwnPost,
  authorUsername,
  authorId,
  isFollowing,
  toggleFollow,
  onDelete,
}: PostMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close the menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative ml-auto" ref={ref}>
      {/* Three-dot toggle button */}
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((prev) => !prev); }}
        className="p-1.5 rounded-full hover:bg-[rgba(29,155,240,0.1)] hover:text-[rgb(29,155,240)] transition-colors cursor-pointer"
      >
        <MoreHorizontal size={18} strokeWidth={1.5} />
      </button>

      {/* Dropdown menu */}
      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-black border border-neutral-700 rounded-xl shadow-lg z-50 py-1">
          {isOwnPost ? (
            /* Own post: delete button */
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); setOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-3 text-[15px] text-red-500 hover:bg-neutral-900 transition-colors cursor-pointer"
            >
              <Trash2 size={18} />
              Delete
            </button>
          ) : (
            /* Other user's post: follow/unfollow toggle */
            <button
              onClick={(e) => { e.stopPropagation(); toggleFollow.mutate({ targetUserId: authorId }); setOpen(false); }}
              disabled={toggleFollow.isPending}
              className="flex items-center gap-3 w-full px-4 py-3 text-white font-bold text-xl hover:bg-neutral-900 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isFollowing ? (
                <><UserMinus size={20} /> Unfollow @{authorUsername}</>
              ) : (
                <><UserPlus size={20} /> Follow @{authorUsername}</>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
