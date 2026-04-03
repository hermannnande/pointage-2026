import type { NextConfig } from "next";

const ONE_YEAR = 31536000;
const ONE_WEEK = 604800;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: ONE_WEEK,
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "date-fns",
      "@supabase/supabase-js",
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
      {
        source: "/icon-192.png",
        headers: [
          { key: "Cache-Control", value: `public, max-age=${ONE_WEEK}` },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          { key: "Cache-Control", value: `public, max-age=${ONE_WEEK}` },
        ],
      },
    ];
  },
};

export default nextConfig;
