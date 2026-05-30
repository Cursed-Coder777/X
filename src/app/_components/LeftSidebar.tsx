/**
 * LeftSidebar — left-hand navigation (X/Twitter style).
 *
 * Navigation: Home, Explore (/search), Notifications, Messages, Bookmarks, Profile.
 * Active tab highlighted via pathname matching.
 * Messages nav shows a blue badge with total unread count across conversations.
 * "Post" button navigates to /compose (placeholder).
 * Account pill at bottom links to the user's own profile.
 *
 * Responsive: 88px collapsed (icon-only), 275px expanded at xl (icon+label).
 */
"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Home,
  Search,
  Bell,
  Mail,
  Bookmark,
  User,
  MoreHorizontal,
  Feather,
} from "lucide-react";
import { api } from "~/trpc/react";

export default function LeftSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { data: conversations } = api.conversation.getConversations.useQuery(undefined, {
    enabled: !!session,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
  const { data: unreadNotifications } = api.notification.getUnreadCount.useQuery(undefined, {
    enabled: !!session,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const username = session?.user?.username ?? session?.user?.email?.split("@")[0] ?? "";
  const profileHref = username ? `/profile/${username}` : "/profile";

  const navItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Search, label: "Explore", href: "/search" },
    { icon: Bell, label: "Notifications", href: "/notifications" },
    { icon: Mail, label: "Messages", href: "/messages" },
    { icon: Bookmark, label: "Bookmarks", href: "/bookmarks" },
    { icon: User, label: "Profile", href: profileHref },
  ];

  const totalUnread = conversations?.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0;
  const unreadNotifCount = unreadNotifications ?? 0;

  return (
    <aside className="flex flex-col h-screen sticky top-0 w-[88px] xl:w-[275px] px-2 xl:px-4 py-2">
      {/* X Logo */}
      <div className="flex items-center justify-center xl:justify-start mb-2 p-3">
        <Link href="/">
          <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white" aria-label="X">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </Link>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map(({ icon: Icon, label, href }) => {
          const isActive = pathname === href || (label === "Profile" && pathname.startsWith("/profile/")) || (label === "Explore" && pathname.startsWith("/search"));
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-4 p-3 rounded-full hover:bg-neutral-900 transition-colors w-fit xl:w-full"
            >
              <span className="relative flex-shrink-0">
                <Icon size={26} strokeWidth={isActive ? 2.5 : 1.75} />
                {label === "Messages" && totalUnread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[rgb(29,155,240)] text-white text-[11px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
                {label === "Notifications" && unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[rgb(29,155,240)] text-white text-[11px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                  </span>
                )}
              </span>
              <span className={`hidden xl:block text-xl ${isActive ? "font-bold" : "font-normal"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Post Button */}
      <div className="mt-4 flex justify-center xl:justify-start">
        <button
          onClick={() => router.push("/compose")}
          className="hidden xl:flex items-center justify-center w-full py-3.5 rounded-full font-bold text-[17px] text-white bg-[rgb(29,155,240)] hover:bg-[rgb(26,140,216)] transition-colors"
        >
          Post
        </button>
        <button
          onClick={() => router.push("/compose")}
          className="xl:hidden flex items-center justify-center w-12 h-12 rounded-full text-white bg-[rgb(29,155,240)] hover:bg-[rgb(26,140,216)] transition-colors"
        >
          <Feather size={20} />
        </button>
      </div>

      {/* Account */}
      {session?.user && (
        <Link
          href={profileHref}
          className="mt-auto mb-3 flex items-center gap-3 p-3 rounded-full hover:bg-neutral-900 transition-colors w-fit xl:w-full"
        >
          <div className="h-10 w-10 rounded-full bg-neutral-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
            {session.user.image ? (
              <img src={session.user.image} alt="avatar" className="w-full h-full object-cover" width={40} height={40} />
            ) : (
              <User size={20} className="text-neutral-400" />
            )}
          </div>
          <div className="hidden xl:flex flex-col min-w-0 flex-1">
            <span className="font-bold text-[15px] truncate">{session.user.name}</span>
            <span className="text-neutral-500 text-[15px] truncate">
              @{session.user.username ?? session.user.email?.split("@")[0]}
            </span>
          </div>
          <MoreHorizontal size={18} className="hidden xl:block text-neutral-500 flex-shrink-0" />
        </Link>
      )}
    </aside>
  );
}
