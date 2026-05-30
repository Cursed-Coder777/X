/**
 * CommentCard — displays a single comment in the comment list.
 * Shows user avatar (or fallback icon), name, username, relative timestamp,
 * and the comment content. The username links to the user's profile.
 * Clicking the name link stops propagation to avoid triggering parent clicks.
 */
"use client";
import { User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface CommentCardProps {
  id: string;
  content: string;
  user: { id: string; name: string | null; username: string | null; image: string | null };
  createdAt: Date;
}

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

export default function CommentCard({ content, user, createdAt }: CommentCardProps) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <div className="flex-shrink-0">
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name ?? "Avatar"}
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
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 text-[15px]">
          <Link
            href={`/profile/${user.username ?? ""}`}
            className="font-bold text-white text-sm hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {user.name ?? "Unknown"}
          </Link>
          <span className="text-neutral-500 text-sm truncate">@{user.username}</span>
          <span className="text-neutral-500">·</span>
          <span className="text-neutral-500 text-sm">{timeAgo(createdAt)}</span>
        </div>
        <p className="text-[15px] text-white whitespace-pre-wrap break-words mt-0.5">
          {content}
        </p>
      </div>
    </div>
  );
}
