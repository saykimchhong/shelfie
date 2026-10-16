"use client";

import type { ReactNode } from "react";
import { Badge, Stack, Text } from "@/components/ui";
import type { Product } from "@/domain/product";
import type { Currency } from "@/domain/store";
import type { Draft } from "./drafts";
import type { Missing } from "./merge";
import { MissingList, ReviewList } from "./ReviewList";
import styles from "./MergeReview.module.scss";

// The "Check" step, grouped by what saving will do. A new shelf has only new
// products, so it shows a single untitled list.
export function MergeReview({
  drafts,
  missing,
  known,
  currency,
  onChange,
  onToggleMissing,
}: {
  drafts: Draft[];
  missing: Missing[];
  // The filmed shelf's products, by id. Empty for a new shelf.
  known: ReadonlyMap<string, Product>;
  currency: Currency;
  onChange: (key: string, patch: Partial<Draft>) => void;
  onToggleMissing: (productId: string, soldOut: boolean) => void;
}) {
  const added = drafts.filter((draft) => draft.group === "new");
  const updated = drafts.filter((draft) => draft.group === "update");
  const unchanged = drafts.length - added.length - updated.length;
  const merging = known.size > 0;

  return (
    <Stack gap={5}>
      {added.length > 0 ? (
        <Group title={merging ? "New" : null} count={added.length}>
          <ReviewList drafts={added} currency={currency} onChange={onChange} />
        </Group>
      ) : null}

      {updated.length > 0 ? (
        <Group title="Updates" count={updated.length}>
          <ReviewList drafts={updated} known={known} currency={currency} onChange={onChange} />
        </Group>
      ) : null}

      {missing.length > 0 ? (
        <Group title="Not in this video" count={missing.length}>
          <MissingList missing={missing} currency={currency} onToggle={onToggleMissing} />
        </Group>
      ) : null}

      {unchanged > 0 ? (
        <Text size="sm" tone="muted" align="center">
          {unchanged} already up to date
        </Text>
      ) : null}
    </Stack>
  );
}

function Group({ title, count, children }: { title: string | null; count: number; children: ReactNode }) {
  return (
    <section className={styles.group}>
      {title ? (
        <Stack direction="row" align="center" gap={2}>
          <Text as="h2" size="lg" weight={700}>
            {title}
          </Text>
          <Badge tone="brand">{count}</Badge>
        </Stack>
      ) : null}
      {children}
    </section>
  );
}
