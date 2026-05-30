"use client";
import { useParams, useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import PostCard from "~/app/_components/PostCard";
import ShellLayout from "~/app/_components/ShellLayout";
import EditProfileModal from "~/app/_components/EditProfileModal";
import AuthGuard from "~/app/_components/AuthGuard";
import LoadingScreen from "~/app/_components/LoadingScreen";
import { Loader2, MessageCircle } from "lucide-react";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params?.username ?? "";
  const { data: session } = useSession();
  const utils = api.useUtils();

  const { data: user, isLoading: userLoading } = api.user.getByUsername.useQuery(
    { username },
    { enabled: !!username }
  );
  const { data: posts, isLoading: postsLoading } = api.user.getUserPosts.useQuery(
    { userId: user?.id ?? "" },
    { enabled: !!user?.id }
  );
  const { data: followStatus } = api.user.isFollowing.useQuery(
    { targetUserId: user?.id ?? "" },
    { enabled: !!user?.id && session?.user.id !== user?.id }
  );
  const [isFollowing, setIsFollowing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (followStatus?.isFollowing !== undefined) {
      setIsFollowing(followStatus.isFollowing);
    }
  }, [followStatus?.isFollowing]);

  const router = useRouter();
  const createConversation = api.conversation.getOrCreate.useMutation({
    onSuccess: (data) => {
      router.push(`/messages?conversationId=${data.id}`);
    },
  });

  const handleMessage = () => {
    if (!user?.id) return;
    createConversation.mutate({ participantId: user.id });
  };

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

  if (userLoading) return <LoadingScreen />;
  if (!user) return <div className="p-8 text-neutral-500">User not found</div>;

  const isOwnProfile = session?.user.id === user.id;

  return (
    <AuthGuard>
      <ShellLayout>
        {user.bannerUrl && (
          <div className="h-32 sm:h-48 w-full relative bg-neutral-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user.bannerUrl}
              alt="Banner"
              className="object-cover"
              style={{ objectFit: "cover", width: "100%", height: "100%" }}
            />
          </div>
        )}

        <div className="p-6 border-b border-neutral-800">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {user.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={user.image}
                    alt={user.name}
                    width={48}
                    height={48}
                    className="rounded-full object-cover h-12 w-12"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-neutral-700" />
                )}
              </div>
              <h1 className="text-2xl font-bold text-white">{user.name}</h1>
              <p className="text-neutral-500">@{user.username}</p>
              {user.bio && <p className="mt-2 text-white">{user.bio}</p>}
              <div className="flex gap-4 mt-3 text-sm text-neutral-500">
                <span><strong className="text-white">{user._count.posts}</strong> posts</span>
                <span><strong className="text-white">{user._count.followers}</strong> followers</span>
                <span><strong className="text-white">{user._count.following}</strong> following</span>
              </div>
            </div>
            {isOwnProfile ? (
              <button
                onClick={() => setShowEditModal(true)}
                className="rounded-full px-4 py-2 font-semibold text-sm transition border border-neutral-600 text-white bg-black hover:bg-neutral-900"
              >
                Edit profile
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {isFollowing && (
                  <button
                    onClick={handleMessage}
                    disabled={createConversation.isPending}
                    className="flex items-center gap-1.5 rounded-full px-4 py-2 font-semibold transition border border-neutral-600 text-white hover:bg-neutral-900"
                  >
                    {createConversation.isPending ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <MessageCircle size={18} />
                    )}
                    <span className="hidden sm:inline">Message</span>
                  </button>
                )}
                <button
                  onClick={handleFollow}
                  disabled={toggleFollow.isPending}
                  className={`rounded-full px-4 py-2 font-semibold transition min-w-[100px] ${isFollowing
                    ? "bg-black text-[rgb(244,33,46)] border border-[rgb(244,33,46)] hover:bg-red-950/30"
                    : "bg-white text-black hover:bg-neutral-200"
                    }`}
                >
                  {toggleFollow.isPending ? <div className="flex items-center justify-center"><Loader2 className="animate-spin" size={20} /></div> : isFollowing ? "Unfollow" : "Follow"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="divide-y divide-neutral-800">
          {postsLoading && <div className="p-4 text-neutral-500">Loading posts...</div>}
          {posts?.map((post) => (
            <PostCard key={post.id} {...post} />
          ))}
          {posts?.length === 0 && !postsLoading && (
            <div className="p-4 text-neutral-500">No posts yet.</div>
          )}
        </div>
      </ShellLayout>
      {showEditModal && <EditProfileModal onClose={() => setShowEditModal(false)} />}
    </AuthGuard>
  );
}
