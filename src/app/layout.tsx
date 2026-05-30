/**
 * Root layout — wraps every page with global styles, fonts, and providers.
 * Defines metadata (title, description, Open Graph, Twitter card) for SEO.
 */

// ── Global Styles ────────────────────────────────────────────────────────────
import "~/styles/globals.css";

// ── Next.js Metadata & Fonts ─────────────────────────────────────────────────
import { type Metadata } from "next";
import { Geist } from "next/font/google";

// ── App-level Providers ──────────────────────────────────────────────────────
import Providers from "./providers";

/**
 * Metadata exported to Next.js <head>.
 * Uses a template pattern so child pages can set their own titles.
 */
export const metadata: Metadata = {
  title: {
    default: "X",
    template: "%s / X",
  },
  description: "A modern social platform built with Next.js",
  icons: [
    { rel: "icon", url: "/favicon.svg", type: "image/svg+xml" },
    { rel: "icon", url: "/favicon.ico" },
  ],
  openGraph: {
    type: "website",
    siteName: "X",
    title: "X",
    description: "A modern social platform built with Next.js",
  },
  twitter: {
    card: "summary_large_image",
    title: "X",
    description: "A modern social platform built with Next.js",
  },
};

/**
 * Load the Geist sans-serif font from Google Fonts.
 * The `variable` property exposes it as a CSS custom property.
 */
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

/**
 * RootLayout — the top-level HTML structure.
 * Wraps all children in the Geist font class and the Providers component
 * (which includes tRPC, NextAuth session provider, etc.).
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
