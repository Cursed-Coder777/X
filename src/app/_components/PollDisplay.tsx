/**
 * PollDisplay — renders a poll inline within a PostCard or post detail page.
 *
 * Features:
 *   - Single-vote or multi-vote mode (based on poll.maxVotes)
 *   - Visual bar showing vote percentage after the user has voted
 *   - Optimistic UI update on vote
 *   - Disabled state when poll has expired or mutation is pending
 *   - Vote counts and percentage display
 *   - "Final results" label for expired polls
 *   - Checkbox-style UI for multi-vote polls
 *
 * Props:
 *   poll   — PollData object from the API
 *   postId — the parent post ID (for cache invalidation)
 */

"use client";

// React state for tracking selected options
import { useState } from "react";
// tRPC client for vote mutation and cache invalidation
import { api } from "~/trpc/react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PollOptionData {
  id: string;
  text: string;
  _count: { votes: number };
}

interface PollData {
  id: string;
  options: PollOptionData[];
  expiresAt: Date | null;
  maxVotes: number;
  userVotedOptionIds: string[];
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function PollDisplay({ poll, postId }: { poll: PollData; postId: string }) {
  // tRPC utility bag for cache invalidation
  const utils = api.useUtils();
  // Local state for selected option IDs (initialised from the user's existing votes)
  const [selectedIds, setSelectedIds] = useState<string[]>(poll.userVotedOptionIds);

  const isMulti = poll.maxVotes > 1;

  // ── Vote Mutation ─────────────────────────────────────────────────────────
  const voteMutation = api.poll.vote.useMutation({
    onSuccess: () => {
      // Invalidate feed caches so the UI refreshes
      void utils.post.getFeed.invalidate();
      void utils.post.getAll.invalidate();
    },
  });

  // ── Derived Values ────────────────────────────────────────────────────────
  const totalVotes = poll.options.reduce((sum, o) => sum + o._count.votes, 0);
  const isExpired = poll.expiresAt ? new Date(poll.expiresAt) < new Date() : false;
  const hasVoted = selectedIds.length > 0;

  // ── Vote Handler ──────────────────────────────────────────────────────────
  const handleClick = (optionId: string) => {
    if (isExpired || voteMutation.isPending) return;

    if (isMulti) {
      // Multi-vote: toggle selection within maxVotes limit
      const next = selectedIds.includes(optionId)
        ? selectedIds.filter((id) => id !== optionId)
        : selectedIds.length < poll.maxVotes
          ? [...selectedIds, optionId]
          : selectedIds;

      setSelectedIds(next);
      voteMutation.mutate({ pollId: poll.id, optionIds: next });
    } else {
      // Single-vote: select or deselect
      const next = selectedIds.includes(optionId) ? [] : [optionId];
      setSelectedIds(next);
      voteMutation.mutate({ pollId: poll.id, optionIds: next });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="mt-3 space-y-2">
      {poll.options.map((option) => {
        const pct = totalVotes > 0 ? Math.round((option._count.votes / totalVotes) * 100) : 0;
        const isSelected = selectedIds.includes(option.id);

        return (
          <button
            key={option.id}
            onClick={(e) => { e.stopPropagation(); handleClick(option.id); }}
            disabled={voteMutation.isPending}
            className="relative w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-neutral-700 text-left transition-colors enabled:hover:border-[rgb(29,155,240)] disabled:opacity-60"
          >
            {/* Background fill bar showing vote percentage */}
            <div
              className="absolute inset-0 rounded-lg transition-all"
              style={{
                backgroundColor: isSelected ? "rgba(29,155,240,0.15)" : "transparent",
                width: hasVoted ? `${pct}%` : "0%",
              }}
            />
            {/* Option label and checkbox */}
            <span className="relative z-10 flex items-center gap-2">
              {isMulti && (
                <span className={`w-4 h-4 rounded border ${isSelected ? "bg-[rgb(29,155,240)] border-[rgb(29,155,240)]" : "border-neutral-500"} flex items-center justify-center text-[10px] text-white font-bold`}>
                  {isSelected ? "✓" : ""}
                </span>
              )}
              <span className={`text-sm ${isSelected ? "font-bold text-white" : "text-white"}`}>
                {option.text}
              </span>
            </span>
            {/* Percentage label (shown after voting) */}
            {hasVoted && (
              <span className="relative z-10 ml-auto text-sm text-neutral-500">
                {pct}%
              </span>
            )}
          </button>
        );
      })}
      {/* Footer row: total votes, multi-vote progress, voted label, expiry */}
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>
        {isMulti && hasVoted && <span>{selectedIds.length} of {poll.maxVotes}</span>}
        {!isMulti && hasVoted && <span className="text-[rgb(29,155,240)]">Voted</span>}
        {isExpired && <span>Final results</span>}
      </div>
    </div>
  );
}
