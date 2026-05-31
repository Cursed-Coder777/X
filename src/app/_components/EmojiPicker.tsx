"use client";

import { useState, useRef, useEffect } from "react";
import { Smile } from "lucide-react";

const EMOJIS = [
  "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "🥲",
  "😊", "😇", "🙂", "😉", "😌", "😍", "🥰", "😘",
  "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪",
  "🤨", "🧐", "😎", "🤩", "🥳", "😏", "😒", "😞",
  "😔", "😟", "😕", "🙁", "😣", "😖", "😫", "😩",
  "😢", "😭", "😤", "😠", "😡", "🤬", "🔥", "❤️",
  "💀", "👀", "👏", "🙌", "🤝", "👍", "👎", "💯",
  "🎉", "🎊", "✨", "💪", "🤞", "✌️", "🤙", "👋",
  "🫡", "🫠", "🥹", "😶‍🌫️", "💅", "✨", "⭐", "🌟",
];

export default function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-2 rounded-full transition-colors hover:bg-[rgba(29,155,240,0.1)] cursor-pointer"
      >
        <Smile size={18} />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-2 p-2 bg-black border border-neutral-700 rounded-xl shadow-lg z-50 w-[280px]">
          <div className="grid grid-cols-8 gap-1 max-h-[200px] overflow-y-auto">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => { onSelect(emoji); setOpen(false); }}
                className="p-1.5 hover:bg-neutral-800 rounded-lg text-xl transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
