import path from "node:path";
import type { NextConfig } from "next";

// Firebase App Hosting injects the web app's config at build time as
// FIREBASE_WEBAPP_CONFIG (JSON). Map it onto the NEXT_PUBLIC_FIREBASE_* names
// the app reads, so deploys need no Firebase keys in the repo or the console.
// Anything set explicitly (.env.local, console env vars) still wins.
function firebaseEnvFromAppHosting(): Record<string, string> {
  const raw = process.env.FIREBASE_WEBAPP_CONFIG;
  if (!raw) return {};
  try {
    const config = JSON.parse(raw) as Record<string, string | undefined>;
    const mapped: Record<string, string | undefined> = {
      NEXT_PUBLIC_FIREBASE_API_KEY: config.apiKey,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: config.authDomain,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: config.projectId,
      NEXT_PUBLIC_FIREBASE_APP_ID: config.appId,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: config.storageBucket,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: config.messagingSenderId,
    };
    return Object.fromEntries(
      Object.entries(mapped).filter((entry): entry is [string, string] => !!entry[1] && !process.env[entry[0]]),
    );
  } catch {
    return {};
  }
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  env: firebaseEnvFromAppHosting(),
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
