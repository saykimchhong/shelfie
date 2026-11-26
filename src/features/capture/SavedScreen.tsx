import { ArrowLeft, Check, ExternalLink } from "lucide-react";
import { ButtonLink, Stack, Text } from "@/components/ui";
import type { Store } from "@/domain/store";
import { ShareLinkButton } from "@/features/seller/ShareLinkButton";
import { pluralize } from "@/lib/format";
import { storeUrl } from "@/lib/site";
import styles from "./SavedScreen.module.scss";

// The payoff after saving: what just went live, and the next thing to do
// with it (see it, share it), instead of dropping back to the dashboard.
export function SavedScreen({ store, added, updated }: { store: Store; added: number; updated: number }) {
  const title =
    added > 0
      ? `${pluralize(added, "product")} ${added === 1 ? "is" : "are"} ${store.published ? "live" : "saved"}`
      : `${pluralize(updated, "change")} saved`;
  const detail = !store.published
    ? "Your shop is still hidden. Turn on “Visible to customers” on your dashboard when you're ready."
    : added > 0 && updated > 0
      ? `Plus ${pluralize(updated, "update")} to products you already had. Customers can order now.`
      : "Customers can see it and order now.";

  return (
    <Stack gap={6} align="center" className={styles.saved}>
      <span className={styles.badge} aria-hidden>
        <Check />
      </span>
      <Stack gap={2} align="center">
        <Text as="h1" size="3xl" align="center">
          {title}
        </Text>
        <Text tone="muted" align="center" className={styles.detail}>
          {detail}
        </Text>
      </Stack>
      <Stack gap={3} align="center" className={styles.actions}>
        {store.published ? (
          <ButtonLink
            href={storeUrl(store.slug)}
            target="_blank"
            rel="noreferrer"
            size="lg"
            block
            iconAfter={<ExternalLink />}
          >
            See your shop
          </ButtonLink>
        ) : null}
        <Stack direction="row" gap={2} justify="center" wrap>
          {store.published ? <ShareLinkButton url={storeUrl(store.slug)} title={store.name} /> : null}
          <ButtonLink href="/dashboard" variant="ghost" size="sm" icon={<ArrowLeft />}>
            Back to dashboard
          </ButtonLink>
        </Stack>
      </Stack>
    </Stack>
  );
}
