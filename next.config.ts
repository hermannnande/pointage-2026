import type { NextConfig } from "next";

const ONE_YEAR = 31536000;
const ONE_WEEK = 604800;
const ONE_DAY = 86400;

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
      "@tanstack/react-table",
      "react-day-picker",
      "cmdk",
      "react-hook-form",
      "zod",
      "sonner",
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
          { key: "Cache-Control", value: `public, max-age=${ONE_YEAR}, immutable` },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          { key: "Cache-Control", value: `public, max-age=${ONE_DAY}` },
        ],
      },
    ];
  },
};

export default nextConfig;
