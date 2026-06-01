/**
 * Theme provider — manages dark/light mode for the entire app.
 *
 * Features:
 *   - Defaults to "dark" mode on first visit
 *   - Persists the user's preference in localStorage under the "theme" key
 *   - Toggles the "light" class on document.documentElement (used by Tailwind
 *     CSS v4 dark mode via the `light` class strategy)
 *   - Avoids flash of unstyled content (FOUC) by rendering children immediately
 *     and only applying theme classes after the component has mounted
 *
 * Usage:
 *   import { useTheme } from "~/app/providers/ThemeProvider";
 *   const { theme, toggleTheme } = useTheme();
 */

"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Theme type: either "dark" or "light"
type Theme = "dark" | "light";

// Shape of the context value provided to all consumers
interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

// No-op function used as the default toggleTheme before the provider is mounted
const noop = () => { void 0; };

// Create the theme context with a default value (dark mode, no-op toggle)
const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: noop,
});

/**
 * Hook to access the current theme and toggle function.
 * Must be used within a ThemeProvider.
 */
export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * ThemeProvider component — wraps children with the theme context.
 * Manages the theme state, localStorage persistence, and DOM class toggling.
 */
export default function ThemeProvider({ children }: { children: ReactNode }) {
  // Default to "dark" until we read localStorage (prevents layout shift)
  const [theme, setTheme] = useState<Theme>("dark");
  // Track whether the component has mounted (to avoid FOUC)
  const [mounted, setMounted] = useState(false);

  // On first mount, read the stored theme preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
    }
    setMounted(true);
  }, []);

  // Whenever the theme changes (and we've mounted), update the DOM and localStorage
  useEffect(() => {
    if (!mounted) return;
    // Tailwind CSS v4: toggle the "light" class on <html> for dark mode support
    document.documentElement.classList.toggle("light", theme === "light");
    // Persist the preference
    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  // Toggle between dark and light
  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  // Before mounting, render children without the provider to avoid FOUC
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
