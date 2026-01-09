import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        source: "/_next/image/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0"
          }
        ]
      },
      {
        source: "/((?!_next/static|_next/image|api).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0"
          },
          {
            key: "Pragma",
            value: "no-cache"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
