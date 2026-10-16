import type { Metadata } from "next";
import { SellerHome } from "@/features/seller";

export const metadata: Metadata = { title: "My store" };

// Rendered behind the client-side <AuthGate>, so Next can't prerender this
// segment to validate instant navigation. Opt out instead of erroring in dev.
export const instant = false;

export default function DashboardPage() {
  return <SellerHome />;
}
