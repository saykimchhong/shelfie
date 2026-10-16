import type { Metadata } from "next";
import { CapturePanel } from "@/features/capture";

export const metadata: Metadata = { title: "Film your shelf" };

// Behind the client-side <AuthGate>; see dashboard/page.tsx.
export const instant = false;

export default function CapturePage() {
  return <CapturePanel />;
}
