import { AuthGate } from "@/features/auth";
import { SellerShell } from "@/features/seller";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <AuthGate>
      <SellerShell>{children}</SellerShell>
    </AuthGate>
  );
}
