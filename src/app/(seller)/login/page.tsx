import type { Metadata } from "next";
import { Suspense } from "react";
import { FullScreenLoader } from "@/features/auth";
import { LoginPanel } from "./LoginPanel";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    // LoginPanel reads ?next=, which is request data — so it sits behind Suspense.
    <Suspense fallback={<FullScreenLoader />}>
      <LoginPanel />
    </Suspense>
  );
}
