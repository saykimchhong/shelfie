import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  sassOptions: {
    // Lets every style module write `@use "styles" as *;` for tokens + mixins.
    loadPaths: [path.join(process.cwd(), "src")],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" }, // Google avatars
      { protocol: "https", hostname: "firebasestorage.googleapis.com" }, // product photos
    ],
  },
};

export default nextConfig;
