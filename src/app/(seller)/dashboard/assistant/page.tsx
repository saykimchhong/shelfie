import type { Metadata } from "next";
import { AssistantRoom } from "@/features/updates";

export const metadata: Metadata = { title: "Shop assistant" };

// Behind the client-side <AuthGate>; see dashboard/page.tsx.
export const instant = false;

export default function AssistantPage() {
  return <AssistantRoom />;
}
