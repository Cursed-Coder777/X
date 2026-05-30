"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import AuthGuard from "~/app/_components/AuthGuard";
import ShellLayout from "~/app/_components/ShellLayout";
import PostCard from "~/app/_components/PostCard";
import { api } from "~/trpc/react";
import { Search, Loader2 } from "lucide-react";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams?.get("q") ?? "";
  const [input, setInput] = useState(query);

  const { data: results, isLoading } = api.post.search.useQuery(
    { query },
    { enabled: !!query }
  );

  return (
    <AuthGuard>
      <ShellLayout>
        <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-neutral-800">
          <div className="px-4 py-3">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && input.trim()) {
                    const params = new URLSearchParams(window.location.search);
                    params.set("q", input.trim());
                    window.history.pushState(null, "", `/search?${params}`);
                    window.location.reload();
                  }
                }}
                placeholder="Search X"
                className="w-full bg-neutral-900 text-white rounded-full py-2.5 pl-11 pr-4 text-[15px] outline-none focus:ring-1 focus:ring-[rgb(29,155,240)] focus:bg-black transition-colors placeholder-neutral-500 border border-transparent focus:border-neutral-700"
                autoFocus
              />
            </div>
          </div>
        </div>

        {!query && (
          <div className="p-6 text-neutral-500 text-center">Try searching for something</div>
        )}

        {query && isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-neutral-500" size={24} />
          </div>
        )}

        {results?.length === 0 && (
          <div className="p-6 text-neutral-500 text-center">No results for &ldquo;{query}&rdquo;</div>
        )}

        {results?.map((post) => (
          <PostCard key={post.id} {...post} />
        ))}
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
