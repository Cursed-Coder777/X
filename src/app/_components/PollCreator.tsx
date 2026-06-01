/**
 * PollCreator — the poll builder shown inside the CreatePost composer.
 *
 * Features:
 *   - 2–4 text options (50 char max each)
 *   - Add / remove options dynamically
 *   - Settings gear: toggle multi-vote, adjust max votes (2–4) via range slider
 *   - Emits PollData or null to the parent via onPollChange callback
 *   - Only emits data when at least 2 options have text
 *
 * Props:
 *   onPollChange — callback receiving { options: string[], maxVotes: number } | null
 */

"use client";

// React hooks for state management and click-outside detection
import { useState, useRef, useEffect } from "react";
// UI icons
import { X, Plus, Settings } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PollData {
  options: string[];
  maxVotes: number;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function PollCreator({ onPollChange }: { onPollChange: (poll: PollData | null) => void }) {
  // Start with 2 empty option fields
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [showSettings, setShowSettings] = useState(false);
  const [multiVote, setMultiVote] = useState(false);
  const [maxVotes, setMaxVotes] = useState(2);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Click-outside handler for the settings dropdown
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Update a single option at index i
  const updateOption = (i: number, val: string) => {
    const next = [...options];
    next[i] = val;
    setOptions(next);
    emit(next, multiVote, maxVotes);
  };

  // Add a new empty option (max 4 total)
  const addOption = () => {
    if (options.length < 4) setOptions([...options, ""]);
  };

  // Remove an option by index (minimum 2 remain)
  const removeOption = (i: number) => {
    const next = options.filter((_, idx) => idx !== i);
    setOptions(next);
    emit(next, multiVote, maxVotes);
  };

  // Notify parent of the current poll state
  const emit = (opts: string[], mv: boolean, mvVal: number) => {
    const filled = opts.filter((o) => o.trim());
    if (filled.length >= 2) {
      onPollChange({ options: filled, maxVotes: mv ? mvVal : 1 });
    } else {
      onPollChange(null);
    }
  };

  // Toggle multi-vote mode
  const toggleMultiVote = () => {
    const next = !multiVote;
    setMultiVote(next);
    setMaxVotes(next ? 2 : 2);
    emit(options, next, next ? 2 : 1);
  };

  // Change max votes via range slider (2–4)
  const changeMaxVotes = (val: number) => {
    const clamped = Math.max(2, Math.min(val, 4));
    setMaxVotes(clamped);
    emit(options, multiVote, clamped);
  };

  // Count of non-empty options
  const filledCount = options.filter((o) => o.trim()).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="mt-3 space-y-2 border border-neutral-700 rounded-xl p-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-neutral-400">Create a poll</p>
        {/* Settings gear with dropdown */}
        <div ref={settingsRef} className="relative">
          <button type="button" onClick={() => setShowSettings(!showSettings)} className="p-1 rounded-full hover:bg-neutral-800 transition-colors cursor-pointer">
            <Settings size={14} className="text-neutral-500" />
          </button>
          {showSettings && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-black border border-neutral-700 rounded-xl shadow-lg z-50 p-3 space-y-3">
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input type="checkbox" checked={multiVote} onChange={toggleMultiVote} className="accent-[rgb(29,155,240)]" />
                Allow multiple votes
              </label>
              {multiVote && (
                <div className="space-y-1">
                  <p className="text-xs text-neutral-400">Max votes per user: {maxVotes}</p>
                  <input
                    type="range" min={2} max={4} value={maxVotes}
                    onChange={(e) => changeMaxVotes(Number(e.target.value))}
                    className="w-full accent-[rgb(29,155,240)]"
                  />
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>2</span><span>3</span><span>4</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Option input fields */}
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={opt}
            onChange={(e) => updateOption(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
            maxLength={50}
            className="flex-1 bg-transparent border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[rgb(29,155,240)]"
          />
          {/* Remove button — only shown when more than 2 options exist */}
          {options.length > 2 && (
            <button type="button" onClick={() => removeOption(i)} className="text-neutral-500 hover:text-red-500 transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
      ))}

      {/* Add option button (hidden when at 4 max) */}
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
