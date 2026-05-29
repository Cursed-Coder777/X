"use client";
import { useParams } from "next/navigation";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import PostCard from "~/app/_components/PostCard";
import AuthGuard from "~/app/_components/AuthGuard";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params?.username ?? "";
  const { data: session } = useSession();
  const utils = api.useUtils();

  // Fetch user data
  const { data: user, isLoading: userLoading } = api.user.getByUsername.useQuery(
    { username },
    { enabled: !!username }
  );
  // Fetch user's posts
  const { data: posts, isLoading: postsLoading } = api.user.getUserPosts.useQuery(
    { userId: user?.id ?? "" },
    { enabled: !!user?.id }
  );
  // Check if current user follows this profile user
  const { data: followStatus } = api.user.isFollowing.useQuery(
    { targetUserId: user?.id ?? "" },
    { enabled: !!user?.id && session?.user.id !== user?.id }
  );
  const [isFollowing, setIsFollowing] = useState(followStatus?.isFollowing ?? false);

  const toggleFollow = api.user.toggleFollow.useMutation({
    onMutate: async () => {
      await utils.user.isFollowing.cancel();
      const previous = utils.user.isFollowing.getData({ targetUserId: user?.id ?? "" });
      setIsFollowing((prev) => !prev);
      return { previous };
    },
    onError: (err, _, context) => {
      setIsFollowing(context?.previous?.isFollowing ?? false);
      console.error(err);
    },
    onSettled: () => {
      // Invalidate both queries and handle promise rejections
      void utils.user.getByUsername.invalidate().catch(console.error);
      if (user?.id) {
        void utils.user.isFollowing.invalidate({ targetUserId: user.id }).catch(console.error);
      }
    },
  });

  const handleFollow = () => {
    if (!user?.id) return;
    toggleFollow.mutate({ targetUserId: user.id });
  };

  if (userLoading) return <div className="p-8">Loading profile...</div>;
  if (!user) return <div className="p-8">User not found</div>;

  const isOwnProfile = session?.user.id === user.id;

  return (
    <AuthGuard>
      <div className="max-w-2xl mx-auto border-x min-h-screen">
        {/* Profile header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">{user.name}</h1>
              <p className="text-gray-500">@{user.username}</p>
              {user.bio && <p className="mt-2">{user.bio}</p>}
              <div className="flex gap-4 mt-3 text-sm">
                <span><strong>{user._count.posts}</strong> posts</span>
                <span><strong>{user._count.followers}</strong> followers</span>
                <span><strong>{user._count.following}</strong> following</span>
              </div>
            </div>
            {!isOwnProfile && (
              <button
                onClick={handleFollow}
                disabled={toggleFollow.isPending}
                className={`rounded-full px-4 py-2 font-semibold transition ${
                  isFollowing
                    ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                }`}
              >
                {toggleFollow.isPending ? "..." : isFollowing ? "Unfollow" : "Follow"}
              </button>
            )}
          </div>
        </div>

        {/* User's posts */}
        <div className="divide-y">
          {postsLoading && <div className="p-4">Loading posts...</div>}
          {posts?.map((post) => (
            <PostCard key={post.id} {...post} />
          ))}
          {posts?.length === 0 && !postsLoading && (
            <div className="p-4 text-gray-500">No posts yet.</div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}