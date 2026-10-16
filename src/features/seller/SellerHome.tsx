"use client";

import { TriangleAlert } from "lucide-react";
import { EmptyState, Skeleton, Stack } from "@/components/ui";
import { useSignedInUser } from "@/features/auth";
import { CreateStoreForm } from "./CreateStoreForm";
import { useMyStore } from "./data";
import { StoreOverview } from "./StoreOverview";

export function SellerHome() {
  const user = useSignedInUser();
  const store = useMyStore(user.uid);

  if (store.status === "loading") return <DashboardSkeleton />;
  if (store.status === "error") {
    return (
      <EmptyState
        tone="berry"
        icon={<TriangleAlert />}
        title="Couldn't load your store"
        description={store.error?.message}
      />
    );
  }
  return store.data ? <StoreOverview store={store.data} /> : <CreateStoreForm />;
}

export function DashboardSkeleton() {
  return (
    <Stack gap={6} aria-busy>
      <Skeleton height={170} radius="var(--radius-xl)" />
      <Skeleton height={64} radius="var(--radius-xl)" />
      <Skeleton height={240} radius="var(--radius-xl)" />
    </Stack>
  );
}
