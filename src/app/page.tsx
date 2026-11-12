import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { CheckListDrawing, FilmShelfDrawing, ShareLinkDrawing } from "@/components/illustrations/Illustrations";
import { Reveal, Stagger } from "@/components/motion/Reveal";
import { ButtonLink, Container, Text } from "@/components/ui";
import { sampleStorefront } from "@/domain/samples";
import { SHOP_TYPE_INFO } from "@/domain/shop";
import { StorefrontView } from "@/features/storefront";
import { PhonePreview } from "@/features/theme";
import styles from "./page.module.scss";

// The real thing beats a description: an example shop, right on the page.
const example = sampleStorefront("th", { template: "menu", accent: SHOP_TYPE_INFO.food.accent }, "food");

export default function Home() {
  return (
    <div className={styles.page}>
      <Container as="header" className={styles.nav}>
        <Logo />
        <ButtonLink href="/login" variant="soft" size="sm">
          Sign in
        </ButtonLink>
      </Container>

      <Container as="main" className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.copy}>
            <Reveal>
              <Text as="h1" size="display" className={styles.title}>
                Film your shelf. <span className={styles.accent}>Get a shop online.</span>
              </Text>
            </Reveal>
            <Reveal delay={0.08}>
              <Text size="lg" tone="muted" className={styles.lead}>
                Record your shop on your phone and say the prices. Shelfie makes your online shop, ready to
                share on WhatsApp or LINE.
              </Text>
            </Reveal>
            <Reveal delay={0.14} className={styles.ctas}>
              <ButtonLink href="/dashboard" size="lg" iconAfter={<ArrowRight />} className={styles.cta}>
                Start free
              </ButtonLink>
              <ButtonLink href="/templates" variant="soft" size="lg">
                See example shops
              </ButtonLink>
            </Reveal>
            <Reveal delay={0.2}>
              <Text size="sm" tone="subtle">
                Free · No app to install · Khmer, Sinhala, Tamil, Thai and English
              </Text>
            </Reveal>
          </div>

          <Reveal delay={0.1} className={styles.preview}>
            <PhonePreview className={styles.phone} label="An example shop">
              <StorefrontView store={example.store} products={example.products} embedded startIn="en" />
            </PhonePreview>
          </Reveal>
        </section>

        <section className={styles.how} aria-labelledby="how-title">
          <Text as="h2" size="2xl" id="how-title">
            How it works
          </Text>
          <Stagger as="ol" interval={0.08} className={styles.steps}>
            <Step number={1} drawing={<FilmShelfDrawing />} title="Film your shelf">
              Walk past your shelf and say each price out loud. Photos or a typed list work too.
            </Step>
            <Step number={2} drawing={<CheckListDrawing />} title="Check the list">
              Shelfie lists every product with its price. Fix anything with one tap.
            </Step>
            <Step number={3} drawing={<ShareLinkDrawing />} title="Share your link">
              Send your shop link to customers. Their orders arrive in your WhatsApp or LINE.
            </Step>
          </Stagger>
        </section>
      </Container>
    </div>
  );
}

function Step({ number, drawing, title, children }: { number: number; drawing: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className={styles.step}>
      <div className={styles.drawing}>{drawing}</div>
      <Text as="h3" size="lg" weight={700}>
        <span className={styles.number}>{number}</span>
        {title}
      </Text>
      <Text tone="muted">{children}</Text>
    </li>
  );
}
