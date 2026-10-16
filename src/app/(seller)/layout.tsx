import type { ReactNode } from "react";
import { AuthProvider } from "@/features/auth";

// Only seller routes load Firebase Auth. Storefront visitors never download it.
export default function SellerLayout({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
