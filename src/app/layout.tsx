import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import Providers from "./providers";

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

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

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
