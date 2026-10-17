"use client";

import { ExternalLink, ListX, Palette, Plus, Trash2, Video } from "lucide-react";
import { useState } from "react";
import { Reveal, Stagger } from "@/components/motion/Reveal";
import {
  Avatar,
  Badge,
  Button,
  ButtonLink,
  ConfirmSheet,
  EmptyState,
  Skeleton,
  Stack,
  Surface,
  Switch,
  Text,
} from "@/components/ui";
import type { Product } from "@/domain/product";
import { shelvesOf } from "@/domain/shelf";
import type { Store } from "@/domain/store";
import { removeImage } from "@/features/media";
import { pluralize } from "@/lib/format";
import { storeUrl, storeUrlLabel } from "@/lib/site";
import { deleteAllProducts, updateProduct, updateStore, useProducts, useRefreshStorefront } from "./data";
import { ProductEditor } from "./ProductEditor";
import { ProductRow } from "./ProductRow";
import { ShareLinkButton } from "./ShareLinkButton";
import styles from "./StoreOverview.module.scss";

// Which product the editor sheet is showing: one to edit, or "new" to add.
type Editing = { product: Product | null } | null;

export function StoreOverview({ store }: { store: Store }) {
  const products = useProducts(store.slug);
  const refreshStorefront = useRefreshStorefront();
  const [publishing, setPublishing] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [clearing, setClearing] = useState(false);

  async function clearProducts() {
    const photos = await deleteAllProducts(store.slug);
    photos.forEach(removeImage);
    await refreshStorefront(store.slug);
  }

  async function setPublished(published: boolean) {
    setPublishing(true);
    try {
      await updateStore(store.slug, { published });
      await refreshStorefront(store.slug);
    } finally {
      setPublishing(false);
    }
  }

  async function setInStock(product: Product, inStock: boolean) {
    await updateProduct(store.slug, product.id, { inStock });
    await refreshStorefront(store.slug);
  }

  return (
    <Stack gap={6}>
      <Reveal>
        <Surface tone="brand" padding="lg" radius="xl" className={styles.hero}>
          <Stack gap={4}>
            <Stack direction="row" justify="between" align="start" gap={3}>
              <Stack direction="row" align="center" gap={3}>
                <Avatar name={store.name} src={store.logoUrl} size={56} />
                <Stack gap={1}>
                  <Text as="h1" size="3xl">
                    {store.name}
                  </Text>
                  <a href={storeUrl(store.slug)} target="_blank" rel="noreferrer" className={styles.link}>
                    {storeUrlLabel(store.slug)}
                    <ExternalLink aria-hidden />
                  </a>
                </Stack>
              </Stack>
              {store.published ? (
                <Badge tone="success" pulse>
                  Live
                </Badge>
              ) : (
                <Badge>Draft</Badge>
              )}
            </Stack>
            <Stack direction="row" justify="between" align="center" gap={3} wrap>
              <Switch
                checked={store.published}
                onChange={setPublished}
                disabled={publishing}
                label={store.published ? "Visible to customers" : "Hidden from customers"}
                showLabel
              />
              <Stack direction="row" gap={2}>
                <ButtonLink href="/dashboard/edit" variant="soft" size="sm" icon={<Palette />}>
                  Edit store
                </ButtonLink>
                <ShareLinkButton url={storeUrl(store.slug)} title={store.name} />
              </Stack>
            </Stack>
          </Stack>
        </Surface>
      </Reveal>

      <Reveal delay={0.08}>
        <ButtonLink href="/dashboard/capture" size="lg" block icon={<Video />} className={styles.film}>
          Film your shelf
        </ButtonLink>
      </Reveal>

      <Reveal delay={0.16}>
        <Surface padding="sm" radius="xl">
          <Stack direction="row" justify="between" align="center" className={styles.listHeader}>
            <Stack direction="row" align="center" gap={2}>
              <Text as="h2" size="lg" weight={700}>
                Products
              </Text>
              {products.status === "ready" ? <Badge tone="brand">{products.data.length}</Badge> : null}
            </Stack>
            <Stack direction="row" gap={2}>
              {products.data.length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  icon={<ListX />}
                  aria-label="Clear all products"
                  title="Clear all products"
                  onClick={() => setClearing(true)}
                />
              ) : null}
              <Button variant="soft" size="sm" icon={<Plus />} onClick={() => setEditing({ product: null })}>
                Add
              </Button>
            </Stack>
          </Stack>

          {products.status === "loading" ? (
            <Stack gap={2} className={styles.loading}>
              {[0, 1, 2].map((key) => (
                <Skeleton key={key} height={56} radius="var(--radius-md)" />
              ))}
            </Stack>
          ) : products.data.length === 0 ? (
            <EmptyState
              icon={<Video />}
              title="No products yet"
              description="Film your shelf and say the prices — we'll list everything for you."
            />
          ) : (
            <Stagger as="ul" className={styles.list}>
              {products.data.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  currency={store.currency}
                  onOpen={() => setEditing({ product })}
                  onToggleStock={(inStock) => setInStock(product, inStock)}
                />
              ))}
            </Stagger>
          )}
        </Surface>
      </Reveal>

      {products.status === "error" ? (
        <Text size="sm" tone="danger" align="center">
          Couldn&apos;t load products: {products.error?.message}
        </Text>
      ) : null}

      <ProductEditor
        open={editing !== null}
        onClose={() => setEditing(null)}
        store={store}
        product={editing?.product ?? null}
        shelves={shelvesOf(products.data)}
      />

      <ConfirmSheet
        open={clearing}
        onClose={() => setClearing(false)}
        title="Clear all products?"
        acknowledge="I understand this can't be undone"
        confirmLabel={`Delete ${pluralize(products.data.length, "product")}`}
        confirmIcon={<Trash2 />}
        onConfirm={clearProducts}
        errorMessage="Couldn't clear the products. Try again."
      >
        This deletes every product and its photo, for you and your customers. Your store link, details and look stay
        as they are.
      </ConfirmSheet>
    </Stack>
  );
}
