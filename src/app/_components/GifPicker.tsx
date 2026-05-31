"use client";

import { useState, useRef, useEffect } from "react";
import { Film, Search, Loader2, X } from "lucide-react";

interface GifResult {
  url: string;
  preview: string;
  title: string;
}

const SAMPLE_GIFS: GifResult[] = [
  { url: "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDQ3YjI2ZWNmODQzYjE4YzI5NTQ3Y2I4N2Q0YmUzY2I0MjI1N2UzZC9naXBoeS9sMFMzS2xLR1Jqdzl1QS9naXBoeS5naWY.gif", preview: "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDQ3YjI2ZWNmODQzYjE4YzI5NTQ3Y2I4N2Q0YmUzY2I0MjI1N2UzZC9naXBoeS9sMFMzS2xLR1Jqdzl1QS9naXBoeS5naWY.gif", title: "Celebration" },
  { url: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDQ3YjI2ZWNmODQzYjE4YzI5NTQ3Y2I4N2Q0YmUzY2I0MjI1N2UzZC9naXBoeS81M0E1RXFDeGhBR1dRL2dpYnBoeS5naWY.gif", preview: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDQ3YjI2ZWNmODQzYjE4YzI5NTQ3Y2I4N2Q0YmUzY2I0MjI1N2UzZC9naXBoeS81M0E1RXFDeGhBR1dRL2dpYnBoeS5naWY.gif", title: "Clap" },
  { url: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDQ3YjI2ZWNmODQzYjE4YzI5NTQ3Y2I4N2Q0YmUzY2I0MjI1N2UzZC9naXBoeS9sTGdnckxKWWd0WDlBL2dpYnBoeS5naWY.gif", preview: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDQ3YjI2ZWNmODQzYjE4YzI5NTQ3Y2I4N2Q0YmUzY2I0MjI1N2UzZC9naXBoeS9sTGdnckxKWWd0WDlBL2dpYnBoeS5naWY.gif", title: "LOL" },
  { url: "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDQ3YjI2ZWNmODQzYjE4YzI5NTQ3Y2I4N2Q0YmUzY2I0MjI1N2UzZC9naXBoeS9ST2xHTHBWWmNpUTdZL2dpYnBoeS5naWY.gif", preview: "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDQ3YjI2ZWNmODQzYjE4YzI5NTQ3Y2I4N2Q0YmUzY2I0MjI1N2UzZC9naXBoeS9ST2xHTHBWWmNpUTdZL2dpYnBoeS5naWY.gif", title: "Sad" },
  { url: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDQ3YjI2ZWNmODQzYjE4YzI5NTQ3Y2I4N2Q0YmUzY2I0MjI1N2UzZC9naXBoeS9kSDFRQkFBOXdQZDJhL2dpYnBoeS5naWY.gif", preview: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDQ3YjI2ZWNmODQzYjE4YzI5NTQ3Y2I4N2Q0YmUzY2I0MjI1N2UzZC9naXBoeS9kSDFRQkFBOXdQZDJhL2dpYnBoeS5naWY.gif", title: "Shock" },
  { url: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDQ3YjI2ZWNmODQzYjE4YzI5NTQ3Y2I4N2Q0YmUzY2I0MjI1N2UzZC9naXBoeS81bkNEdnhSOHVsS1N5L2dpYnBoeS5naWY.gif", preview: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDQ3YjI2ZWNmODQzYjE4YzI5NTQ3Y2I4N2Q0YmUzY2I0MjI1N2UzZC9naXBoeS81bkNEdnhSOHVsS1N5L2dpYnBoeS5naWY.gif", title: "Eye Roll" },
  { url: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDQ3YjI2ZWNmODQzYjE4YzI5NTQ3Y2I4N2Q0YmUzY2I0MjI1N2UzZC9naXBoeS9mY1FNOTlPZ2tOWE9hL2dpYnBoeS5naWY.gif", preview: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExMDQ3YjI2ZWNmODQzYjE4YzI5NTQ3Y2I4N2Q0YmUzY2I0MjI1N2UzZC9naXBoeS9mY1FNOTlPZ2tOWE9hL2dpYnBoeS5naWY.gif", title: "Fist Bump" },
];

export default function GifPicker({ onSelect }: { onSelect: (gifUrl: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GifResult[]>([]);
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

  useEffect(() => {
    if (!query.trim()) {
      setResults(SAMPLE_GIFS);
      return;
    }
  }, [query]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-2 rounded-full transition-colors hover:bg-[rgba(29,155,240,0.1)] cursor-pointer"
      >
        <Film size={18} />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-2 p-3 bg-black border border-neutral-700 rounded-xl shadow-lg z-50 w-[320px]">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search GIFs..."
                className="w-full bg-neutral-900 text-white text-sm rounded-full py-2 pl-8 pr-4 outline-none focus:ring-1 focus:ring-[rgb(29,155,240)] placeholder-neutral-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-neutral-500 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto">
            {results.map((gif) => (
              <button
                key={gif.url}
                type="button"
                onClick={() => { onSelect(gif.url); setOpen(false); }}
                className="rounded-lg overflow-hidden border border-neutral-700 hover:border-[rgb(29,155,240)] transition-colors"
              >
                <img
                  src={gif.preview}
                  alt={gif.title}
                  className="w-full h-28 object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
          {results.length === 0 && query.trim() && (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin text-neutral-500" size={20} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
