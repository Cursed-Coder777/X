import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "X";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="#fff"
          style={{ width: 120, height: 120 }}
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        <p
          style={{
            marginTop: 24,
            fontSize: 48,
            color: "#fff",
            fontWeight: 700,
            fontFamily: "system-ui",
          }}
        >
          X
        </p>
        <p
          style={{
            fontSize: 24,
            color: "#888",
            marginTop: 8,
          }}
        >
          A modern social platform built with Next.js
        </p>
      </div>
    ),
    { ...size },
  );
}
