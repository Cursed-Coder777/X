"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

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

export default function PollDisplay({ poll }: { poll: PollData; postId: string }) {
  const utils = api.useUtils();
  const [selectedIds, setSelectedIds] = useState<string[]>(poll.userVotedOptionIds);

  const isMulti = poll.maxVotes > 1;

  const voteMutation = api.poll.vote.useMutation({
    onSuccess: () => {
      void utils.post.getFeed.invalidate();
      void utils.post.getAll.invalidate();
    },
  });

  const totalVotes = poll.options.reduce((sum, o) => sum + o._count.votes, 0);
  const isExpired = poll.expiresAt ? new Date(poll.expiresAt) < new Date() : false;
  const hasVoted = selectedIds.length > 0;

  const handleClick = (optionId: string) => {
    if (isExpired || voteMutation.isPending) return;

    if (isMulti) {
      const next = selectedIds.includes(optionId)
        ? selectedIds.filter((id) => id !== optionId)
        : selectedIds.length < poll.maxVotes
          ? [...selectedIds, optionId]
          : selectedIds;

      setSelectedIds(next);
      voteMutation.mutate({ pollId: poll.id, optionIds: next });
    } else {
      const next = selectedIds.includes(optionId) ? [] : [optionId];
      setSelectedIds(next);
      voteMutation.mutate({ pollId: poll.id, optionIds: next });
    }
  };

  return (
    <div className="mt-3 space-y-2">
      {poll.options.map((option) => {
        const pct = totalVotes > 0 ? Math.round((option._count.votes / totalVotes) * 100) : 0;
        const isSelected = selectedIds.includes(option.id);

        return (
          <button
            key={option.id}
            onClick={(e) => {
              e.stopPropagation();
              handleClick(option.id);
            }}
            disabled={voteMutation.isPending}
            className="relative w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-neutral-700 text-left transition-colors enabled:hover:border-[rgb(29,155,240)] disabled:opacity-60"
          >
            <div
              className="absolute inset-0 rounded-lg transition-all"
              style={{
                backgroundColor: isSelected ? "rgba(29,155,240,0.15)" : "transparent",
                width: hasVoted ? `${pct}%` : "0%",
              }}
            />
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
            {hasVoted && (
              <span className="relative z-10 ml-auto text-sm text-neutral-500">
                {pct}%
              </span>
            )}
          </button>
        );
      })}
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>
        {isMulti && hasVoted && (
          <span>{selectedIds.length} of {poll.maxVotes}</span>
        )}
        {!isMulti && hasVoted && <span className="text-[rgb(29,155,240)]">Voted</span>}
        {isExpired && <span>Final results</span>}
      </div>
    </div>
  );
}
