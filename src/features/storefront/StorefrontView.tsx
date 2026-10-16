"use client";

import clsx from "clsx";
import { PackageOpen } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { ScrollStagger } from "@/components/motion/ScrollStagger";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { Container, EmptyState, Text } from "@/components/ui";
import type { Product } from "@/domain/product";
import type { PublicStore } from "@/domain/store";
import { DEFAULT_THEME } from "@/domain/theme";
import { initials } from "@/lib/format";
import { OrderBar } from "./OrderBar";
import type { CartLine } from "./order";
import { ProductCard } from "./ProductCard";
import { ProductListItem } from "./ProductListItem";
import styles from "./StorefrontView.module.scss";

export type StorefrontViewProps = {
  store: PublicStore;
  products: Product[];
  // Inside a preview frame (dashboard, /templates) rather than the real page.
  embedded?: boolean;
};

export function StorefrontView({ store, products, embedded }: StorefrontViewProps) {
  const theme = store.theme ?? DEFAULT_THEME;
  const chipId = useId();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [category, setCategory] = useState<string | null>(null);

  const canOrder = Boolean(store.contact.whatsapp || store.contact.line);
  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category).filter((value): value is string => !!value))],
    [products],
  );
  const visible = category ? products.filter((product) => product.category === category) : products;
  const lines: CartLine[] = products
    .filter((product) => cart[product.id])
    .map((product) => ({ product, quantity: cart[product.id] }));

  function setQuantity(productId: string, quantity: number) {
    setCart((current) => {
      const next = { ...current };
      if (quantity <= 0) delete next[productId];
      else next[productId] = quantity;
      return next;
    });
  }

  const itemProps = (product: Product) => ({
    product,
    currency: store.currency,
    quantity: cart[product.id] ?? 0,
    onQuantityChange: canOrder ? (quantity: number) => setQuantity(product.id, quantity) : undefined,
  });

  return (
    <ThemeScope accent={theme.accent} className={clsx(styles.page, styles[`t-${theme.template}`])}>
      <header className={styles.banner}>
        <Container className={styles.header}>
          <span className={styles.avatar} aria-hidden>
            {store.logoUrl ? (
              <Image src={store.logoUrl} alt="" fill sizes="104px" className={styles.avatarImage} />
            ) : (
              initials(store.name)
            )}
          </span>
          <div className={styles.titles}>
            <Text as="h1" size="3xl">
              {store.name}
            </Text>
            {store.tagline ? (
              <Text tone="muted" clamp={2}>
                {store.tagline}
              </Text>
            ) : null}
            {store.description ? <About text={store.description} /> : null}
          </div>
        </Container>
      </header>

      <Container as={embedded ? "section" : "main"} className={styles.main}>
        {categories.length > 1 ? (
          <nav className={styles.chips} aria-label="Categories">
            {[null, ...categories].map((value) => {
              const active = value === category;
              return (
                <button
                  key={value ?? "all"}
                  type="button"
                  aria-pressed={active}
                  className={clsx(styles.chip, active && styles.chipActive)}
                  onClick={() => setCategory(value)}
                >
                  {active ? <motion.span layoutId={chipId} className={styles.chipThumb} /> : null}
                  <span className={styles.chipLabel}>{value ?? "All"}</span>
                </button>
              );
            })}
          </nav>
        ) : null}

        {products.length === 0 ? (
          <EmptyState icon={<PackageOpen />} title="Shelves coming soon" tone="sun" />
        ) : theme.template === "list" ? (
          <ScrollStagger as="ul" className={styles.list} interval={0.03}>
            {visible.map((product) => (
              <li key={product.id}>
                <ProductListItem {...itemProps(product)} />
              </li>
            ))}
          </ScrollStagger>
        ) : (
          <ScrollStagger
            className={clsx(styles.grid, theme.template === "showcase" && styles.showcaseGrid)}
            interval={0.035}
          >
            {visible.map((product) => (
              <ProductCard
                key={product.id}
                variant={theme.template === "showcase" ? "showcase" : "grid"}
                {...itemProps(product)}
              />
            ))}
          </ScrollStagger>
        )}

        <Link href="/" className={styles.madeWith}>
          <LogoMark size={18} />
          Made with Shelfie
        </Link>
      </Container>

      <OrderBar store={store} lines={lines} onQuantityChange={setQuantity} onClear={() => setCart({})} />
    </ThemeScope>
  );
}

// Shop description: three lines, with "More" when there's more to read.
function About({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 140 || text.split("\n").length > 3;

  return (
    <div className={styles.about}>
      <p className={clsx(styles.description, long && !open && styles.clamped)}>{text}</p>
      {long ? (
        <button type="button" className={styles.more} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "Less" : "More"}
        </button>
      ) : null}
    </div>
  );
}
