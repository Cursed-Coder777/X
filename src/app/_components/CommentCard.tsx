/**
 * CommentCard — displays a single comment with optional nested replies.
 *
 * Features:
 *   - Author avatar (or fallback icon), name, @username, relative timestamp
 *   - Comment content text
 *   - Reply button (only on top-level, depth=0 comments)
 *   - Recursive rendering of nested replies with visual indentation
 *   - Collapsible reply threads with "Show X replies" / "Hide replies" toggle
 *   - Vertical connector line for visual thread hierarchy
 */

"use client";

// UI icons
import { User, MessageCircle } from "lucide-react";
// Next.js optimized image component
import Image from "next/image";
// Link for author profile navigation
import Link from "next/link";
// State for reply thread toggling
import { useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface CommentData {
  id: string;
  content: string;
  parentId: string | null;
  createdAt: Date;
  user: { id: string; name: string | null; username: string | null; image: string | null };
  replies?: CommentData[];
}

interface CommentCardProps {
  comment: CommentData;
  depth?: number;
  onReply: (commentId: string, username: string) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Returns a short relative timestamp (e.g. "5s", "3m", "2h", "1d") */
function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffSecs < 60) return `${diffSecs}s`;
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function CommentCard({ comment, depth = 0, onReply }: CommentCardProps) {
  // Replies are visible by default at depth 0, hidden deeper
  const [showReplies, setShowReplies] = useState(depth === 0);
  const hasReplies = comment.replies && comment.replies.length > 0;

  return (
    <div>
      {/* Comment row — visually indented for nested replies */}
      <div className={`flex gap-3 px-4 py-3 ${depth > 0 ? "pl-12" : ""}`}>
        {/* Avatar column */}
        <div className="flex-shrink-0">
          {comment.user.image ? (
            <Image
              src={comment.user.image}
              alt={comment.user.name ?? "Avatar"}
              className="h-8 w-8 rounded-full object-cover"
              width={32}
              height={32}
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-500">
              <User size={16} />
            </div>
          )}
        </div>

        {/* Body column */}
        <div className="flex-1 min-w-0">
          {/* Author row: name (linked), @username, dot separator, timestamp */}
          <div className="flex items-center gap-1 text-[15px]">
            <Link
              href={`/profile/${comment.user.username ?? ""}`}
              className="font-bold text-white text-sm hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {comment.user.name ?? "Unknown"}
            </Link>
            <span className="text-neutral-500 text-sm truncate">@{comment.user.username}</span>
            <span className="text-neutral-500">·</span>
            <span className="text-neutral-500 text-sm">{timeAgo(comment.createdAt)}</span>
          </div>

          {/* Comment body text */}
          <p className="text-[15px] text-white whitespace-pre-wrap break-words mt-0.5">
            {comment.content}
          </p>

          {/* Reply button — only on top-level (depth 0) comments */}
          {depth === 0 && (
            <button
              onClick={() => onReply(comment.id, comment.user.username ?? "")}
              className="flex items-center gap-1.5 mt-1 text-neutral-500 hover:text-[rgb(29,155,240)] transition-colors text-sm"
            >
              <MessageCircle size={14} strokeWidth={1.5} />
              <span>Reply</span>
            </button>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {hasReplies && (
        <div className="relative">
          {/* Vertical connector line for visual thread hierarchy */}
          {depth === 0 && (
            <div className="absolute left-[39px] top-0 bottom-0 w-px bg-neutral-800" />
          )}

          {/* Toggle replies button (hidden when replies are visible) */}
          {depth === 0 && !showReplies && (
            <button
              onClick={() => setShowReplies(true)}
              className="ml-12 mb-1 text-[rgb(29,155,240)] text-sm hover:underline"
            >
              Show {comment.replies!.length} {comment.replies!.length === 1 ? "reply" : "replies"}
            </button>
          )}

          {/* Render nested replies recursively */}
          {showReplies &&
            comment.replies!.map((reply) => (
              <CommentCard key={reply.id} comment={reply} depth={depth + 1} onReply={onReply} />
            ))}

          {/* Hide replies button */}
          {depth === 0 && showReplies && comment.replies!.length > 0 && (
            <button
              onClick={() => setShowReplies(false)}
              className="ml-12 mb-1 text-[rgb(29,155,240)] text-sm hover:underline"
            >
              Hide replies
            </button>
          )}
        </div>
      )}
    </div>
  );
}
