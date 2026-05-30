/**
 * ShellLayout — top-level layout wrapper for every page.
 * Renders a three-column layout:
 *  - LeftSidebar (desktop only)
 *  - Main content area (max-w-[600px] by default, [990px] when wide)
 *  - RightSidebar (desktop only, optional)
 * On mobile a hamburger button opens the MobileDrawer (AnimatePresence).
 */
"use client";

// State to control the mobile drawer visibility
import { useState, type ReactNode } from "react";
// Framer Motion's AnimatePresence for exit animations on the drawer
import { AnimatePresence } from "framer-motion";
// Hamburger menu icon for mobile
import { Menu } from "lucide-react";
// Sidebar components
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";
// Mobile slide-in drawer
import MobileDrawer from "./MobileDrawer";

interface ShellLayoutProps {
  children: ReactNode;
  wide?: boolean;            // When true, main area expands to 990px
  hideRightSidebar?: boolean;  // Allows pages like search to hide the right panel
  hideMobileMenu?: boolean;    // Allows pages to suppress the hamburger button
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
      {/* Desktop left sidebar (hidden below lg) */}
      <div className="hidden lg:block">
        <LeftSidebar />
      </div>

      {/* Mobile slide-in drawer with exit animation */}
      <AnimatePresence>
        {menuOpen && <MobileDrawer onClose={() => setMenuOpen(false)} />}
      </AnimatePresence>

      {/* Mobile hamburger button (hidden on lg+) */}
      {!hideMobileMenu && (
        <button
          onClick={() => setMenuOpen(true)}
          className="fixed top-3 left-3 z-40 lg:hidden p-2.5 rounded-full bg-black/80 backdrop-blur-sm hover:bg-neutral-900 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
      )}

      {/* Main content column */}
      <main
        className={`flex-1 ${
          wide ? "max-w-[990px]" : "max-w-[600px]"
        } border-x border-neutral-800 max-lg:border-x-0 min-h-screen`}
      >
        {children}
      </main>

      {/* Desktop right sidebar (optional) */}
      {!hideRightSidebar && <RightSidebar />}
    </div>
  );
}
