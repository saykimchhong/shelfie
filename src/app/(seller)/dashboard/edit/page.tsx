import type { Metadata } from "next";
import { StoreEditorPage } from "@/features/seller";

export const metadata: Metadata = { title: "Edit store" };

// Behind the client-side <AuthGate>; see dashboard/page.tsx.
export const instant = false;

export default function EditStorePage() {
  return <StoreEditorPage />;
}
