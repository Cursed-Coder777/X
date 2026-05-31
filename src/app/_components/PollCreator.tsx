"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";

interface PollData {
  options: string[];
}

export default function PollCreator({
  onPollChange,
}: {
  onPollChange: (poll: PollData | null) => void;
}) {
  const [options, setOptions] = useState<string[]>(["", ""]);

  const updateOption = (i: number, val: string) => {
    const next = [...options];
    next[i] = val;
    setOptions(next);
    emit(next);
  };

  const addOption = () => {
    if (options.length < 4) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (i: number) => {
    const next = options.filter((_, idx) => idx !== i);
    setOptions(next);
    emit(next);
  };

  const emit = (opts: string[]) => {
    const filled = opts.filter((o) => o.trim());
    onPollChange(filled.length >= 2 ? { options: filled } : null);
  };

  const filledCount = options.filter((o) => o.trim()).length;

  return (
    <div className="mt-3 space-y-2 border border-neutral-700 rounded-xl p-3">
      <p className="text-sm font-semibold text-neutral-400">Create a poll</p>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={opt}
            onChange={(e) => updateOption(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
            maxLength={50}
            className="flex-1 bg-transparent border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[rgb(29,155,240)]"
          />
          {options.length > 2 && (
            <button
              type="button"
              onClick={() => removeOption(i)}
              className="text-neutral-500 hover:text-red-500 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      ))}
      {options.length < 4 && (
        <button
          type="button"
          onClick={addOption}
          disabled={filledCount < 2}
          className="flex items-center gap-1 text-sm text-[rgb(29,155,240)] hover:underline disabled:opacity-50 disabled:no-underline"
        >
          <Plus size={14} />
          Add option
        </button>
      )}
    </div>
  );
}
