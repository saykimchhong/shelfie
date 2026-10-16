import { SearchX } from "lucide-react";
import { ButtonLink, Container, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <Container as="main" size="narrow" style={{ minHeight: "80dvh", display: "grid", placeItems: "center" }}>
      <EmptyState
        tone="sun"
        icon={<SearchX />}
        title="Nothing on this shelf"
        description="This store doesn't exist or isn't open yet."
        action={<ButtonLink href="/">Go home</ButtonLink>}
      />
    </Container>
  );
}
