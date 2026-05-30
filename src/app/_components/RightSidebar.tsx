/**
 * RightSidebar — the right-hand panel (X/Twitter style).
 * Contains:
 * - Search bar: submits to /search?q=
 * - Trends for you: top 5 hashtags from the past 7 days
 * - Who to follow: 3 suggested users not yet followed
 *
 * All sections are hidden on screens below lg breakpoint.
 * Search input has X-blue focus ring. Trends/suggestions fetched via tRPC.
 */
"use client";

// Local state for the search input and a ref to the input element
import { useState, useRef } from "react";
// Router for programmatic navigation on search + trend/follow clicks
import { useRouter } from "next/navigation";
// tRPC client for trending and suggestion queries + follow mutation
import { api } from "~/trpc/react";
// Icons: search magnifier, loading spinner, fallback user avatar
import { Search, Loader2, User } from "lucide-react";

export default function RightSidebar() {
  const router = useRouter();
  // Controlled search query value
  const [query, setQuery] = useState("");
  // Ref to the input — useful for focus management if needed
  const inputRef = useRef<HTMLInputElement>(null);

  // Query: top trending hashtags
  const { data: trending, isLoading: trendingLoading } = api.post.getTrending.useQuery();
  // Query: suggested users to follow
  const { data: suggestions } = api.user.getSuggestions.useQuery();
  // Mutation: toggle follow on a user
  const toggleFollow = api.user.toggleFollow.useMutation();

  // Navigate to the search results page on form submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <aside className="w-[300px] xl:w-[350px] hidden lg:flex flex-col gap-4 px-4 xl:px-6 py-3 h-screen sticky top-0 overflow-y-auto">
      {/* Search bar — sticky at top */}
      <form onSubmit={handleSearch} className="sticky top-0 pt-1 pb-2 bg-black z-10">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-black text-white rounded-full py-2.5 pl-11 pr-4 text-[15px] outline-none focus:ring-1 focus:ring-[rgb(29,155,240)] transition-colors placeholder-neutral-500 border border-neutral-700 focus:border-[rgb(29,155,240)]"
          />
        </div>
      </form>

      {/* Trends for you card */}
      <div className="bg-black border border-neutral-800 rounded-2xl overflow-hidden">
        <h2 className="font-bold text-xl px-4 pt-4 pb-2">Trends for you</h2>
        {/* Loading spinner */}
        {trendingLoading && (
          <div className="flex justify-center py-6">
            <Loader2 className="animate-spin text-neutral-500" size={20} />
          </div>
        )}
        {/* Trend items — clicking navigates to the hashtag search */}
        {trending?.map(({ hashtag, count }) => (
          <button
            key={hashtag}
            onClick={() => router.push(`/search?q=${encodeURIComponent(hashtag)}`)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-800 transition-colors text-left"
          >
            <div>
              <p className="font-bold text-[15px] text-white">{hashtag}</p>
              <p className="text-[13px] text-neutral-500">{count.toLocaleString()} posts</p>
            </div>
          </button>
        ))}
        {/* Empty state */}
        {trending?.length === 0 && (
          <p className="px-4 py-6 text-neutral-500 text-sm">No trends yet</p>
        )}
      </div>

      {/* Who to follow card */}
      <div className="bg-black border border-neutral-800 rounded-2xl overflow-hidden">
        <h2 className="font-bold text-xl px-4 pt-4 pb-2">Who to follow</h2>
        {suggestions?.map((s) => (
          <div key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-neutral-800 transition-colors">
            {/* User info — clicking navigates to their profile */}
            <button
              onClick={() => router.push(`/profile/${s.username}`)}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <div className="h-10 w-10 rounded-full bg-neutral-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
                {s.image ? (
                  <img src={s.image} alt="" className="w-full h-full object-cover" width={40} height={40} />
                ) : (
                  <User size={20} className="text-neutral-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[15px] truncate text-white">{s.name}</p>
                <p className="text-neutral-500 text-[13px] truncate">@{s.username}</p>
              </div>
            </button>
            {/* Follow / unfollow button */}
            <button
              onClick={() => toggleFollow.mutate({ targetUserId: s.id })}
              disabled={toggleFollow.isPending}
              className="ml-3 rounded-full bg-white text-black font-bold text-sm px-4 py-1.5 hover:bg-neutral-200 transition-colors flex-shrink-0 disabled:opacity-50"
            >
              Follow
            </button>
          </div>
        ))}
        {/* Empty state */}
        {suggestions?.length === 0 && (
          <p className="px-4 py-6 text-neutral-500 text-sm">No suggestions</p>
        )}
      </div>
    </aside>
  );
}
