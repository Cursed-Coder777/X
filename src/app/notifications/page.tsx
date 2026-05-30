"use client";
import AuthGuard from "~/app/_components/AuthGuard";
import ShellLayout from "~/app/_components/ShellLayout";
import { api, type RouterOutputs } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { User, Loader2, Heart, Repeat2, MessageCircle, UserPlus } from "lucide-react";

type NotificationItem = RouterOutputs["notification"]["getAll"][number];

function timeAgo(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
}

const typeConfig = {
  LIKE: { icon: Heart, color: "text-pink-500" },
  REPOST: { icon: Repeat2, color: "text-green-500" },
  COMMENT: { icon: MessageCircle, color: "text-blue-500" },
  FOLLOW: { icon: UserPlus, color: "text-blue-400" },
} as const;

export default function NotificationsPage() {
  const router = useRouter();
  const utils = api.useUtils();
  const { data: notifications, isLoading } = api.notification.getAll.useQuery();
  const markAsRead = api.notification.markAsRead.useMutation({
    onSuccess: () => void utils.notification.getUnreadCount.invalidate(),
  });
  const markAllAsRead = api.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      void utils.notification.getUnreadCount.invalidate();
      void utils.notification.getAll.invalidate();
    },
  });

  const handleClick = async (n: NotificationItem) => {
    if (!n.read) {
      markAsRead.mutate({ id: n.id });
    }
    if (n.type === "FOLLOW") {
      router.push(`/profile/${n.actor.username}`);
    } else if (n.post) {
      router.push(`/post/${n.post.id}`);
    }
  };

  return (
    <AuthGuard>
      <ShellLayout>
        <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-neutral-800 flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold">Notifications</h1>
          {notifications?.some((n) => !n.read) && (
            <button
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
              className="text-sm font-semibold text-[rgb(29,155,240)] hover:underline"
            >
              {markAllAsRead.isPending ? "Marking..." : "Mark all as read"}
            </button>
          )}
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-neutral-500" size={24} />
          </div>
        )}

        {notifications?.length === 0 && (
          <div className="p-12 text-center text-neutral-500">
            <BellIcon className="mx-auto mb-4" size={32} />
            <p className="text-lg font-semibold text-white">Nothing yet</p>
            <p className="text-sm mt-1">When you get likes, reposts, comments, or follows, they&apos;ll show up here.</p>
          </div>
        )}

        <div>
          {notifications?.map((n) => {
            const config = typeConfig[n.type as keyof typeof typeConfig] ?? typeConfig.LIKE;
            const Icon = config.icon;
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-neutral-900/50 transition-colors border-b border-neutral-800 ${
                  !n.read ? "bg-neutral-900/30" : ""
                }`}
              >
                <div className="flex-shrink-0 flex flex-col items-center gap-1">
                  <div className={`${config.color}`}>
                    <Icon size={20} />
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-neutral-700 overflow-hidden flex items-center justify-center">
                    {n.actor.image ? (
                      <img src={n.actor.image} alt="" className="w-full h-full object-cover" width={40} height={40} />
                    ) : (
                      <User size={20} className="text-neutral-400" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] leading-snug">
                    <span className="font-bold hover:underline cursor-pointer">{n.actor.name}</span>{" "}
                    {n.type === "LIKE" && "liked your post"}
                    {n.type === "REPOST" && "reposted your post"}
                    {n.type === "COMMENT" && "replied to your post"}
                    {n.type === "FOLLOW" && "followed you"}
                  </p>
                  {n.post && n.type !== "FOLLOW" && (
                    <p className="text-neutral-500 text-[15px] truncate mt-0.5">{n.post.content}</p>
                  )}
                  <p className="text-neutral-500 text-[13px] mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && (
                  <div className="flex-shrink-0 mt-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-[rgb(29,155,240)]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </ShellLayout>
    </AuthGuard>
  );
}

function BellIcon({ className, size }: { className?: string; size: number }) {
  return (
    <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}
