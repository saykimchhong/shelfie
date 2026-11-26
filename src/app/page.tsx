import { ArrowRight, Check } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Reveal } from "@/components/motion/Reveal";
import { ButtonLink, Container, Text } from "@/components/ui";
import { HeroTitle, HowItWorks, PhotoStrip } from "@/features/landing";
import { exampleFruitStall } from "@/features/landing/exampleShop";
import { StorefrontView } from "@/features/storefront";
import { PhonePreview } from "@/features/theme";
import styles from "./page.module.scss";

// The real thing beats a description: an example shop, right on the page.
const example = exampleFruitStall();

const PROMISES = [
  "Prices said out loud become prices on your shop",
  "Customers order on WhatsApp or LINE",
  "Your own PromptPay or LankaQR for payment",
];

export default function Home() {
  return (
    <div className={styles.page}>
      <Container as="header" className={styles.nav}>
        <Logo />
        <ButtonLink href="/login" variant="soft" size="sm">
          Sign in
        </ButtonLink>
      </Container>

      <main>
        <Container as="section" className={styles.hero}>
          <Reveal>
            <HeroTitle />
          </Reveal>
          <Reveal delay={0.12}>
            <Text size="lg" tone="muted" align="center" className={styles.lead}>
              Record your shop on your phone and say the prices. Shelfie makes your online shop, ready to share on
              WhatsApp or LINE.
            </Text>
          </Reveal>
          <Reveal delay={0.18} className={styles.ctas}>
            <ButtonLink href="/dashboard" size="lg" iconAfter={<ArrowRight />} className={styles.cta}>
              Start free
            </ButtonLink>
            <ButtonLink href="/templates" variant="soft" size="lg">
              See example shops
            </ButtonLink>
          </Reveal>
          <Reveal delay={0.22}>
            <Text size="sm" tone="subtle" align="center">
              Free · No app to install
            </Text>
          </Reveal>
        </Container>

        <Reveal delay={0.3} effect="fade" className={styles.strip}>
          <PhotoStrip />
        </Reveal>

        <Container className={styles.sections}>
          <section className={styles.showcase} aria-labelledby="showcase-title">
            <div className={styles.showcaseCopy}>
              <Text as="h2" size="3xl" id="showcase-title">
                Your shelf, as a shop.
              </Text>
              <Text size="lg" tone="muted">
                One video of a fruit stall became this. Customers tap, pick, and send the order.
              </Text>
              <ul className={styles.promises}>
                {PROMISES.map((promise) => (
                  <li key={promise}>
                    <Check aria-hidden />
                    {promise}
                  </li>
                ))}
              </ul>
            </div>
            <PhonePreview className={styles.phone} label="An example shop">
              <StorefrontView store={example.store} products={example.products} embedded startIn="en" />
            </PhonePreview>
          </section>

          <section className={styles.how} aria-labelledby="how-title">
            <Text as="h2" size="3xl" id="how-title">
              How it works
            </Text>
            <HowItWorks />
          </section>

          <section className={styles.final}>
            <Text as="h2" size="3xl" align="center">
              Your shop, online today.
            </Text>
            <ButtonLink href="/dashboard" size="lg" iconAfter={<ArrowRight />} className={styles.cta}>
              Start free
            </ButtonLink>
          </section>
        </Container>
      </main>
    </div>
  );
}
