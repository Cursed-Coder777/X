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
}

export default function PollDisplay({ poll, postId: _postId }: { poll: PollData; postId: string }) {
  const utils = api.useUtils();
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null);

  const voteMutation = api.poll.vote.useMutation({
    onSuccess: (data) => {
      setVotedOptionId(data.votedOptionId);
      void utils.post.getFeed.invalidate();
      void utils.post.getAll.invalidate();
    },
  });

  const totalVotes = poll.options.reduce((sum, o) => sum + o._count.votes, 0);
  const isExpired = poll.expiresAt ? new Date(poll.expiresAt) < new Date() : false;
  const hasVoted = votedOptionId !== null;

  return (
    <div className="mt-3 space-y-2">
      {poll.options.map((option) => {
        const pct = totalVotes > 0 ? Math.round((option._count.votes / totalVotes) * 100) : 0;
        const isSelected = votedOptionId === option.id;

        return (
          <button
            key={option.id}
            onClick={(e) => {
              e.stopPropagation();
              if (!hasVoted && !isExpired) {
                voteMutation.mutate({ optionId: option.id });
              }
            }}
            disabled={hasVoted || isExpired || voteMutation.isPending}
            className="relative w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-neutral-700 text-left transition-colors disabled:opacity-80 enabled:hover:border-[rgb(29,155,240)]"
          >
            <div
              className="absolute inset-0 rounded-lg transition-all"
              style={{
                backgroundColor: isSelected ? "rgba(29,155,240,0.15)" : "transparent",
                width: hasVoted ? `${pct}%` : "0%",
              }}
            />
            <span className={`relative z-10 text-sm ${isSelected ? "font-bold text-white" : "text-white"}`}>
              {option.text}
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
        {hasVoted && <span className="text-[rgb(29,155,240)]">Voted</span>}
        {isExpired && <span>Final results</span>}
      </div>
    </div>
  );
}
