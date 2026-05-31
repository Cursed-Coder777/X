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

// Client-side navigation link
import Link from "next/link";
// Hooks for current pathname and imperative navigation
import { usePathname, useRouter } from "next/navigation";
// Session data for user-aware links and account pill
import { useSession } from "next-auth/react";
// Icons for every nav item + account pill
import {
  Home,
  Search,
  Bell,
  Mail,
  Bookmark,
  User,
  MoreHorizontal,
  Feather,
  Moon,
  Sun,
} from "lucide-react";
// tRPC client for unread counts
import { api } from "~/trpc/react";
import { useTheme } from "~/app/providers/ThemeProvider";

export default function LeftSidebar() {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  // Poll unread conversation counts every 15 seconds (only when authenticated)
  const { data: conversations } = api.conversation.getConversations.useQuery(undefined, {
    enabled: !!session,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
  // Poll unread notification count every 15 seconds
  const { data: unreadNotifications } = api.notification.getUnreadCount.useQuery(undefined, {
    enabled: !!session,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  // Derive the profile href from session username or email local-part
  const username = session?.user?.username ?? session?.user?.email?.split("@")[0] ?? "";
  const profileHref = username ? `/profile/${username}` : "/profile";

  // Navigation item definitions
  const navItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Search, label: "Explore", href: "/search" },
    { icon: Bell, label: "Notifications", href: "/notifications" },
    { icon: Mail, label: "Messages", href: "/messages" },
    { icon: Bookmark, label: "Bookmarks", href: "/bookmarks" },
    { icon: User, label: "Profile", href: profileHref },
  ];

  // Aggregate unread counts
  const totalUnread = conversations?.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0;
  const unreadNotifCount = unreadNotifications ?? 0;

  return (
    <aside className="flex flex-col h-screen sticky top-0 w-[88px] xl:w-[275px] px-2 xl:px-4 py-2">
      {/* X logo — links to home */}
      <div className="flex items-center justify-center xl:justify-start mb-2 p-3">
        <Link href="/">
          <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white" aria-label="X">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </Link>
      </div>

      {/* Theme toggle */}
      <div className="px-2 xl:px-0">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-4 p-3 rounded-full hover:bg-neutral-900 transition-colors w-fit xl:w-full mx-auto xl:mx-0"
        >
          <span className="flex-shrink-0">
            {theme === "dark" ? <Sun size={26} strokeWidth={1.75} /> : <Moon size={26} strokeWidth={1.75} />}
          </span>
          <span className="hidden xl:block text-xl font-normal">
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </span>
        </button>
      </div>

      {/* Navigation items */}
      <nav className="flex flex-col gap-1">
        {navItems.map(({ icon: Icon, label, href }) => {
          // Determine active state: exact match, or prefix match for Profile/Explore
          const isActive = pathname === href || (label === "Profile" && pathname.startsWith("/profile/")) || (label === "Explore" && pathname.startsWith("/search"));
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-4 p-3 rounded-full hover:bg-neutral-900 transition-colors w-fit xl:w-full mx-auto xl:mx-0"
            >
              <span className="relative flex-shrink-0">
                <Icon size={26} strokeWidth={isActive ? 2.5 : 1.75} />
                {/* Unread message badge */}
                {label === "Messages" && totalUnread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[rgb(29,155,240)] text-white text-[11px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
                {/* Unread notification badge */}
                {label === "Notifications" && unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[rgb(29,155,240)] text-white text-[11px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                  </span>
                )}
              </span>
              {/* Label is hidden on small sidebar, visible on xl+ */}
              <span className={`hidden xl:block text-xl ${isActive ? "font-bold" : "font-normal"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Post button — two variants for collapsed vs expanded sidebar */}
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

      {/* Current user account pill — links to own profile */}
      {session?.user && (
        <Link
          href={profileHref}
          className="mt-auto mb-3 flex items-center gap-3 p-3 rounded-full hover:bg-neutral-900 transition-colors w-fit xl:w-full mx-auto xl:mx-0"
        >
          <div className="h-10 w-10 rounded-full bg-neutral-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
            {session.user.image ? (
              <img src={session.user.image} alt="avatar" className="w-full h-full object-cover" width={40} height={40} />
            ) : (
              <User size={20} className="text-neutral-400" />
            )}
          </div>
          {/* Expanded details hidden on collapsed sidebar */}
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
