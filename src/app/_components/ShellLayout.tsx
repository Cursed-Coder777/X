/**
 * ShellLayout — top-level layout wrapper for every page.
 *
 * Renders a three-column layout (X/Twitter style):
 *   - LeftSidebar (desktop, hidden on mobile)
 *   - Main content area (max-w-[600px] default, [990px] when `wide`)
 *   - RightSidebar (desktop, optional via `hideRightSidebar` prop)
 *
 * On mobile (< lg breakpoint), a floating hamburger button opens the
 * MobileDrawer slide-in navigation panel (animated with Framer Motion).
 *
 * Props:
 *   children          — page content rendered in the center column
 *   wide              — expands main column to 990px
 *   hideRightSidebar  — suppresses the right panel (used by Messages page)
 *   hideMobileMenu    — hides the hamburger button (for pages with their own header)
 */
"use client";

// State for mobile drawer visibility
import { useState, type ReactNode } from "react";
// Framer Motion's AnimatePresence for mount/unmount animations on the drawer
import { AnimatePresence } from "framer-motion";
// Hamburger menu icon for mobile
import { Menu } from "lucide-react";
// Desktop sidebar components
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";
// Mobile slide-in navigation drawer
import MobileDrawer from "./MobileDrawer";

interface ShellLayoutProps {
  children: ReactNode;
  wide?: boolean;               // When true, main area expands to 990px
  hideRightSidebar?: boolean;   // Allows pages like messages to hide the right panel
  hideMobileMenu?: boolean;     // Allows pages to suppress the hamburger button
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
      {/* Desktop left sidebar (hidden below lg breakpoint) */}
      <div className="hidden lg:block">
        <LeftSidebar />
      </div>

      {/* Mobile slide-in drawer with Framer Motion enter/exit animation */}
      <AnimatePresence>
        {menuOpen && <MobileDrawer onClose={() => setMenuOpen(false)} />}
      </AnimatePresence>

      {/* Mobile hamburger button (hidden on lg+) — fixed position top-left */}
      {!hideMobileMenu && (
        <button
          onClick={() => setMenuOpen(true)}
          className="fixed top-3 left-3 z-40 lg:hidden p-2.5 rounded-full bg-black/80 backdrop-blur-sm hover:bg-neutral-900 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
      )}

      {/* Main content column — centered, max-width constrained */}
      <main
        className={`flex-1 ${
          wide ? "max-w-[990px]" : "max-w-[600px]"
        } border-x border-neutral-800 max-lg:border-x-0 min-h-screen`}
      >
        {children}
      </main>

      {/* Desktop right sidebar (optional — hidden by hideRightSidebar) */}
      {!hideRightSidebar && <RightSidebar />}
    </div>
  );
}
