/**
 * Open Graph image — generated server-side via @vercel/og (ImageResponse).
 *
 * Renders the X logo, brand name, and tagline on a black background.
 * This image is used as the Open Graph / Twitter card preview when sharing
 * links to the app on social media or messaging platforms.
 *
 * Route convention: /opengraph-image (Next.js file-based metadata image)
 * Size: 1200×630 px (standard OG image dimensions)
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image
 */

import { ImageResponse } from "next/og";

// Must run in Edge runtime for @vercel/og to work
export const runtime = "edge";

// Metadata for the image route
export const alt = "X";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Generates the OG image as a 1200×630 PNG.
 * Contains the X logo SVG, brand name, and tagline description.
 */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#000",
        }}
      >
        {/* X logo SVG in white */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#fff" style={{ width: 120, height: 120 }}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        {/* Brand title */}
        <p style={{ marginTop: 24, fontSize: 48, color: "#fff", fontWeight: 700, fontFamily: "system-ui" }}>
          X
        </p>
        {/* Tagline */}
        <p style={{ fontSize: 24, color: "#888", marginTop: 8 }}>
          A modern social platform built with Next.js
        </p>
      </div>
    ),
    { ...size },
  );
}
