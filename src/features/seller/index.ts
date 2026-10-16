// Public surface for routes: components only. Client code that needs the
// Firestore hooks imports "@/features/seller/data" directly — re-exporting them
// here would drag client-only code into Server Component pages.
export { DashboardSkeleton, SellerHome } from "./SellerHome";
export { SellerShell } from "./SellerShell";
export { StoreEditorPage } from "./StoreEditor";
