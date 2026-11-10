"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Reveal } from "@/components/motion/Reveal";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { ButtonLink, Container, Segmented, Surface, Text } from "@/components/ui";
import { sampleStorefront } from "@/domain/samples";
import { DEFAULT_SHOP_TYPE, SHOP_TYPE_INFO, SHOP_TYPES, type ShopType } from "@/domain/shop";
import type { LabelLanguage } from "@/domain/store";
import { DEFAULT_THEME, TEMPLATE_INFO, TEMPLATES } from "@/domain/theme";
import { LABEL_LANGUAGE_OPTIONS } from "@/features/seller/options";
import { StorefrontView } from "@/features/storefront";
import { ColorPicker, PhonePreview } from "@/features/theme";
import styles from "./templates.module.scss";

// Every layout side by side, with sample shops in each label language — for
// reviewing the design system and for sellers choosing a look.
const SHOP_OPTIONS = SHOP_TYPES.map((value) => ({ value, label: SHOP_TYPE_INFO[value].short }));

export function TemplateGallery() {
  const [shopType, setShopType] = useState<ShopType>(DEFAULT_SHOP_TYPE);
  const [accent, setAccent] = useState(DEFAULT_THEME.accent);
  const [language, setLanguage] = useState<LabelLanguage>("en");

  // A shop type brings its own color, as it does for sellers.
  function pickShopType(next: ShopType) {
    setShopType(next);
    setAccent(SHOP_TYPE_INFO[next].accent);
  }

  return (
    <ThemeScope accent={accent} className={styles.page}>
      <Container as="header" className={styles.nav}>
        <Link href="/" aria-label="Shelfie home">
          <Logo />
        </Link>
        <ButtonLink href="/dashboard" size="sm" iconAfter={<ArrowRight />}>
          Start free
        </ButtonLink>
      </Container>

      <Container as="main" className={styles.main}>
        <Reveal>
          <Text as="h1" size="3xl" align="center">
            Pick a look
          </Text>
        </Reveal>

        <Reveal delay={0.06}>
          <Surface padding="md" radius="xl" className={styles.controls}>
            <Segmented
              label="Shop"
              options={SHOP_OPTIONS}
              value={shopType}
              onChange={pickShopType}
              className={styles.shopType}
            />
            <ColorPicker value={accent} onChange={setAccent} />
            <Segmented label="Labels" options={LABEL_LANGUAGE_OPTIONS} value={language} onChange={setLanguage} />
          </Surface>
        </Reveal>

        <div className={styles.phones}>
          {TEMPLATES.map((template, index) => {
            const { store, products } = sampleStorefront(language, { template, accent }, shopType);
            return (
              <Reveal key={template} delay={0.12 + index * 0.06} className={styles.slot}>
                <PhonePreview className={styles.phone} label={`${TEMPLATE_INFO[template].name} · ${TEMPLATE_INFO[template].bestFor}`}>
                  <StorefrontView store={store} products={products} embedded />
                </PhonePreview>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </ThemeScope>
  );
}
