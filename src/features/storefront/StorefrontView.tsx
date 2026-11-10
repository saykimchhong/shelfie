"use client";

import clsx from "clsx";
import { Clock, PackageOpen, Search, SearchX, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { ScrollStagger } from "@/components/motion/ScrollStagger";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { Badge, Button, Container, EmptyState, Text } from "@/components/ui";
import { hasOptions, unitOf, type Product, type Variant } from "@/domain/product";
import { sectionsOf } from "@/domain/shelf";
import { DEFAULT_SHOP_TYPE, shopTypeOf } from "@/domain/shop";
import type { PublicStore } from "@/domain/store";
import { DEFAULT_THEME, type Template } from "@/domain/theme";
import { initials } from "@/lib/format";
import { OptionSheet } from "./OptionSheet";
import { OrderBar } from "./OrderBar";
import { cartLines, lineKey, quantityOf } from "./order";
import { ProductCard } from "./ProductCard";
import { ProductListItem } from "./ProductListItem";
import { ProductMenuItem } from "./ProductMenuItem";
import { matchesSearch, showsSearch } from "./search";
import { useOpenState } from "./useOpenState";
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
  const sectionId = useId();
  const reduceMotion = useReducedMotion();
  // Quantities and notes by cart line (product + size + colour, see lineKey).
  const [cart, setCart] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  // The product whose sizes or colours are being chosen; kept while the sheet
  // closes. A new id per opening starts each choice fresh.
  const [choosing, setChoosing] = useState<{ product: Product; open: boolean; id: number } | null>(null);
  const hours = useOpenState(store.hours, store.timeZone);
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const type = shopTypeOf(store);

  const canOrder = Boolean(store.contact.whatsapp || store.contact.line);
  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category).filter((value): value is string => !!value))],
    [products],
  );
  const searchable = showsSearch(products.length, type.manyItems);
  const searched = searchable && query.trim() ? products.filter((product) => matchesSearch(product, query)) : products;
  const visible = category ? searched.filter((product) => product.category === category) : searched;
  // Menu and shelves show every product in sections; their chips jump to one.
  const sectioned = theme.template === "menu" || theme.template === "shelves";
  const sections = useMemo(() => (sectioned ? sectionsOf(searched) : []), [sectioned, searched]);
  const sectionAnchor = (index: number) => `${sectionId}-section-${index}`;

  function jumpTo(index: number) {
    document.getElementById(sectionAnchor(index))?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }
  const lines = cartLines(products, cart, notes);

  function setQuantity(key: string, quantity: number) {
    setCart((current) => {
      const next = { ...current };
      if (quantity <= 0) delete next[key];
      else next[key] = quantity;
      return next;
    });
    if (quantity <= 0) setNote(key, "");
  }

  function setNote(key: string, note: string) {
    setNotes((current) => {
      const next = { ...current };
      if (note) next[key] = note;
      else delete next[key];
      return next;
    });
  }

  function addChosen(product: Product, variant: Variant) {
    const key = lineKey(product.id, variant);
    setQuantity(key, (cart[key] ?? 0) + 1);
    setChoosing((current) => current && { ...current, open: false });
  }

  const itemProps = (product: Product) => {
    const key = lineKey(product.id);
    const choose = hasOptions(product);
    return {
      product,
      currency: store.currency,
      unit: unitOf(product, store.priceUnit),
      quantity: choose ? quantityOf(lines, product.id) : (cart[key] ?? 0),
      onQuantityChange: canOrder && !choose ? (quantity: number) => setQuantity(key, quantity) : undefined,
      onChoose: canOrder && choose ? () => setChoosing({ product, open: true, id: Date.now() }) : undefined,
    };
  };

  return (
    <ThemeScope
      accent={theme.accent}
      background={theme.background}
      className={clsx(styles.page, styles[`t-${theme.template}`])}
      data-style={store.shopType ?? DEFAULT_SHOP_TYPE}
    >
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
              <Text tone="muted" clamp={2} className={styles.tagline}>
                {store.tagline}
              </Text>
            ) : null}
            {hours ? (
              <Badge
                tone={hours.open ? "success" : "neutral"}
                pulse={hours.open}
                icon={hours.open ? undefined : <Clock />}
                className={styles.hours}
              >
                {hours.label}
              </Badge>
            ) : null}
            {store.description ? <About text={store.description} /> : null}
          </div>
        </Container>
      </header>

      <Container as={embedded ? "section" : "main"} className={styles.main}>
        {searchable ? (
          <label className={styles.search}>
            <Search aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${products.length} products`}
              aria-label="Search products"
              enterKeyHint="search"
            />
            {query ? (
              <button type="button" className={styles.clearSearch} aria-label="Clear search" onClick={() => setQuery("")}>
                <X aria-hidden />
              </button>
            ) : null}
          </label>
        ) : null}

        {sectioned && sections.length > 1 ? (
          <nav className={styles.chips} aria-label="Sections">
            {sections.map((section, index) => (
              <button key={index} type="button" className={styles.chip} onClick={() => jumpTo(index)}>
                <span className={styles.chipLabel}>{section.title}</span>
              </button>
            ))}
          </nav>
        ) : !sectioned && categories.length > 1 ? (
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
          <EmptyState icon={<PackageOpen />} title={type.emptyTitle} tone="sun" />
        ) : searched.length === 0 ? (
          <EmptyState
            icon={<SearchX />}
            title={`Nothing matches “${query.trim()}”`}
            description="Try another word, or the name on the label."
            action={
              <Button variant="soft" onClick={() => setQuery("")}>
                Clear search
              </Button>
            }
          />
        ) : theme.template === "list" ? (
          <ScrollStagger as="ul" className={styles.list} interval={0.03}>
            {visible.map((product) => (
              <li key={product.id}>
                <ProductListItem {...itemProps(product)} />
              </li>
            ))}
          </ScrollStagger>
        ) : theme.template === "menu" ? (
          <div className={clsx(styles.sections, styles.menuSections)}>
            {sections.map((section, index) => (
              <section key={index} id={sectionAnchor(index)} className={styles.menuSection}>
                {section.title ? <h2 className={styles.sectionTitle}>{section.title}</h2> : null}
                <ScrollStagger as="ul" className={styles.menu} interval={0.03}>
                  {section.products.map((product) => (
                    <li key={product.id}>
                      <ProductMenuItem {...itemProps(product)} />
                    </li>
                  ))}
                </ScrollStagger>
              </section>
            ))}
          </div>
        ) : theme.template === "shelves" ? (
          // Rows rise in whole: a vertical rise on a sideways swipe looks wrong.
          <ScrollStagger className={styles.sections} interval={0.05}>
            {sections.map((section, index) => (
              <section key={index} id={sectionAnchor(index)} className={styles.shelfSection}>
                {section.title ? <h2 className={styles.sectionTitle}>{section.title}</h2> : null}
                <div className={styles.rail}>
                  {section.products.map((product) => (
                    <div key={product.id} className={styles.railItem}>
                      <ProductCard {...itemProps(product)} />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </ScrollStagger>
        ) : (
          <ScrollStagger className={clsx(styles.grid, GRID_CLASS[theme.template])} interval={0.035}>
            {visible.map((product) => (
              <ProductCard key={product.id} variant={CARD_VARIANT[theme.template]} {...itemProps(product)} />
            ))}
          </ScrollStagger>
        )}

        <Link href="/" className={styles.madeWith}>
          <LogoMark size={18} />
          Made with Shelfie
        </Link>
      </Container>

      {choosing ? (
        <OptionSheet
          key={choosing.id}
          product={choosing.product}
          open={choosing.open}
          currency={store.currency}
          unit={unitOf(choosing.product, store.priceUnit)}
          onClose={() => setChoosing({ ...choosing, open: false })}
          onAdd={(variant) => addChosen(choosing.product, variant)}
        />
      ) : null}

      <OrderBar
        store={store}
        lines={lines}
        onQuantityChange={setQuantity}
        onNoteChange={setNote}
        onClear={() => {
          setCart({});
          setNotes({});
        }}
      />
    </ThemeScope>
  );
}

// Card templates: which grid and card look each one uses.
const GRID_CLASS: Partial<Record<Template, string>> = {
  showcase: styles.showcaseGrid,
  compact: styles.compactGrid,
};
const CARD_VARIANT: Partial<Record<Template, "showcase" | "compact">> = {
  showcase: "showcase",
  compact: "compact",
};

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
