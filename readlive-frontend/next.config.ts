import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Server actions carry parsed PDF text (saveBookSegments), not the file itself
      bodySizeLimit: "100mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "covers.openlibrary.org",
      },
      {
        protocol: "https",
        hostname: "cgewzgru645gb9bn.public.blob.vercel-storage.com",
      },
    ],
  },
  turbopack: {
    rules: {
      "*.svg": {
        loaders: [
          {
            loader: "@svgr/webpack",
            options: {
              svgo: false,
            },
          },
        ],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
