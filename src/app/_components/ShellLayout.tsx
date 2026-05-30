"use client";
import { useState, type ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import { Menu } from "lucide-react";
import Link from "next/link";
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";
import MobileDrawer from "./MobileDrawer";

interface ShellLayoutProps {
  children: ReactNode;
  wide?: boolean;
  hideRightSidebar?: boolean;
  hideMobileMenu?: boolean;
}

export default function ShellLayout({
  children,
  wide = false,
  hideRightSidebar = false,
  hideMobileMenu = false,
}: ShellLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white flex justify-center">
      <div className="hidden lg:block">
        <LeftSidebar />
      </div>

      <AnimatePresence>
        {menuOpen && <MobileDrawer onClose={() => setMenuOpen(false)} />}
      </AnimatePresence>

      {!hideMobileMenu && (
        <button
          onClick={() => setMenuOpen(true)}
          className="fixed top-3 left-3 z-40 lg:hidden p-2.5 rounded-full bg-black/80 backdrop-blur-sm hover:bg-neutral-900 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
      )}

      <main
        className={`flex-1 ${
          wide ? "max-w-[990px]" : "max-w-[600px]"
        } border-x border-neutral-800 min-h-screen`}
      >
        {children}
      </main>

      {!hideRightSidebar && <RightSidebar />}
    </div>
  );
}
