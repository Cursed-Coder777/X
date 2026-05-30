/**
 * Sidebar — left-hand navigation sidebar (X/Twitter style).
 * Navigation items: Home, Explore, Notifications, Messages, Bookmarks, Profile.
 * Active state is determined by pathname matching.
 *
 * Layout:
 * - X logo at the top
 * - Nav links with icons (icon-only on narrow, icon+label on wide via xl: breakpoint)
 * - "Post" button (full-width on desktop, icon-only on mobile)
 * - Account pill at the bottom linking to the user's own profile
 *
 * Responsive: 88px collapsed, 275px expanded (xl breakpoint).
 */
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import Image from "next/image";

const X_BLUE = "rgb(29,155,240)";
const X_BLUE_DARK = "rgb(26,140,216)";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const username = session?.user?.username ?? session?.user?.email?.split("@")[0] ?? "";
  const profileHref = username ? `/profile/${username}` : "/profile";

  const navItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Search, label: "Explore", href: "/explore" },
    { icon: Bell, label: "Notifications", href: "/notifications" },
    { icon: Mail, label: "Messages", href: "/messages" },
    { icon: Bookmark, label: "Bookmarks", href: "/bookmarks" },
    { icon: User, label: "Profile", href: profileHref },
  ];

  return (
    <aside className="flex flex-col h-screen sticky top-0 w-[88px] xl:w-[275px] px-2 xl:px-4 py-2">
      {/* X Logo */}
      <div className="flex items-center justify-center xl:justify-start mb-2 p-3">
        <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white" aria-label="X">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map(({ icon: Icon, label, href }) => {
          const isActive = pathname === href || (label === "Profile" && pathname.startsWith("/profile/"));
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-4 p-3 rounded-full hover:bg-neutral-900 transition-colors w-fit xl:w-full"
            >
              <Icon size={26} strokeWidth={isActive ? 2.5 : 1.75} className="flex-shrink-0" />
              <span className={`hidden xl:block text-xl ${isActive ? "font-bold" : "font-normal"}`}>
                {label}
              </span>
            </Link>
          );
        })}
        <button className="flex items-center gap-4 p-3 rounded-full hover:bg-neutral-900 transition-colors w-fit xl:w-full">
          <MoreHorizontal size={26} strokeWidth={1.75} className="flex-shrink-0" />
          <span className="hidden xl:block text-xl">More</span>
        </button>
      </nav>

      {/* Post Button */}
      <div className="mt-4 flex justify-center xl:justify-start">
        <button
          className="hidden xl:flex items-center justify-center w-full py-3.5 rounded-full font-bold text-[17px] text-white"
          style={{ backgroundColor: X_BLUE }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = X_BLUE_DARK)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = X_BLUE)}
        >
          Post
        </button>
        <button
          className="xl:hidden flex items-center justify-center w-12 h-12 rounded-full text-white"
          style={{ backgroundColor: X_BLUE }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = X_BLUE_DARK)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = X_BLUE)}
        >
          <Feather size={20} />
        </button>
      </div>

      {/* Account – now a clickable link to profile */}
      {session?.user && (
        <Link
          href={profileHref}
          className="mt-auto mb-3 flex items-center gap-3 p-3 rounded-full hover:bg-neutral-900 transition-colors w-fit xl:w-full"
        >
          <div className="h-10 w-10 rounded-full bg-neutral-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
            {session.user.image ? (
              <Image src={session.user.image} alt="avatar" className="w-full h-full object-cover" width={40} height={40} priority />
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