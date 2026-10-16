"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Button, Container, EmptyState } from "@/components/ui";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container as="main" size="narrow" style={{ minHeight: "80dvh", display: "grid", placeItems: "center" }}>
      <EmptyState
        tone="berry"
        icon={<TriangleAlert />}
        title="Something went wrong"
        description="Please try again."
        action={
          <Button icon={<RotateCcw />} onClick={retry}>
            Try again
          </Button>
        }
      />
    </Container>
  );
}
