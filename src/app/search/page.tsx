"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthGuard from "~/app/_components/AuthGuard";
import ShellLayout from "~/app/_components/ShellLayout";
import PostCard from "~/app/_components/PostCard";
import { api } from "~/trpc/react";
import { Search, User, Loader2 } from "lucide-react";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initial = searchParams?.get("q") ?? "";
  const [input, setInput] = useState(initial);
  const [debounced, setDebounced] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(input), 300);
    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (input) {
      params.set("q", input);
    } else {
      params.delete("q");
    }
    const newQs = params.toString();
    const newUrl = newQs ? `/search?${newQs}` : "/search";
    window.history.replaceState(null, "", newUrl);
  }, [debounced]);

  const { data, isLoading } = api.post.searchAll.useQuery(
    { query: debounced },
    { enabled: !!debounced.trim() },
  );

  const isUserSearch = debounced.startsWith("@");

  return (
    <AuthGuard>
      <ShellLayout>
        <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-neutral-800">
          <div className="px-4 py-3">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Search X"
                className="w-full bg-neutral-900 text-white rounded-full py-2.5 pl-11 pr-4 text-[15px] outline-none focus:ring-1 focus:ring-[rgb(29,155,240)] focus:bg-black transition-colors placeholder-neutral-500 border border-transparent focus:border-neutral-700"
                autoFocus
              />
            </div>
          </div>
        </div>

        {!debounced.trim() && (
          <div className="p-6 text-neutral-500 text-center">Try searching for something</div>
        )}

        {debounced.trim() && isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-neutral-500" size={24} />
          </div>
        )}

        {data && data.users.length === 0 && data.posts.length === 0 && (
          <div className="p-6 text-neutral-500 text-center">No results for &ldquo;{debounced}&rdquo;</div>
        )}

        {data && data.users.length > 0 && (
          <div>
            {!isUserSearch && (
              <div className="px-4 py-3 text-lg font-bold text-white border-b border-neutral-800">People</div>
            )}
            {data.users.map((user) => (
              <button
                key={user.id}
                onClick={() => router.push(`/profile/${user.username}`)}
                className="flex items-center gap-3 w-full px-4 py-3 border-b border-neutral-800 hover:bg-neutral-900/50 transition-colors text-left"
              >
                <div className="h-10 w-10 rounded-full bg-neutral-800 flex items-center justify-center flex-shrink-0">
                  {user.image ? (
                    <img src={user.image} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User size={20} className="text-neutral-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-[15px] truncate">{user.name}</div>
                  <div className="text-neutral-500 text-[15px] truncate">@{user.username}</div>
                  {user.bio && <div className="text-neutral-400 text-[13px] truncate mt-0.5">{user.bio}</div>}
                </div>
              </button>
            ))}
          </div>
        )}

        {data && data.posts.length > 0 && !isUserSearch && (
          <div>
            <div className="px-4 py-3 text-lg font-bold text-white border-b border-neutral-800">Posts</div>
            {data.posts.map((post) => (
              <PostCard key={post.id} {...post} />
            ))}
          </div>
        )}
      </ShellLayout>
    </AuthGuard>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
