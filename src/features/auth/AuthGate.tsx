"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { FullScreenLoader } from "./FullScreenLoader";
import { useAuth } from "./AuthProvider";

// UX guard only: it hides seller pages from signed-out visitors. Real protection
// is in firestore.rules and the server's ID-token checks.
export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "signed-out") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, router, pathname]);

  if (status !== "signed-in") return <FullScreenLoader />;
  return children;
}
