import { ArrowRight, LayoutTemplate, MessageCircle, ScanLine, Video } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Reveal, Stagger } from "@/components/motion/Reveal";
import { ButtonLink, Container, Text } from "@/components/ui";
import styles from "./page.module.scss";

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.blobs} aria-hidden>
        <span />
        <span />
        <span />
      </div>

      <Container as="header" className={styles.nav}>
        <Logo />
        <ButtonLink href="/login" variant="ghost" size="sm">
          Sign in
        </ButtonLink>
      </Container>

      <Container as="main" className={styles.hero}>
        <Reveal>
          <Text as="h1" size="display" align="center" className={styles.title}>
            Film your shelf.
            <br />
            <span className={styles.gradient}>Get a store.</span>
          </Text>
        </Reveal>
        <Reveal delay={0.1}>
          <Text size="lg" tone="muted" align="center" className={styles.lead}>
            One video in. A shareable shop out — prices and local-language labels included.
          </Text>
        </Reveal>
        <Reveal delay={0.2} effect="pop" className={styles.ctas}>
          <ButtonLink href="/dashboard" size="lg" icon={<ArrowRight />} className={styles.cta}>
            Start free
          </ButtonLink>
          <ButtonLink href="/templates" variant="ghost" size="lg" icon={<LayoutTemplate />}>
            See templates
          </ButtonLink>
        </Reveal>

        <Stagger delay={0.3} interval={0.08} className={styles.steps}>
          <Step tone="brand" icon={<Video />} title="Film" />
          <Step tone="sun" icon={<ScanLine />} title="Check" />
          <Step tone="accent" icon={<MessageCircle />} title="Sell" />
        </Stagger>
      </Container>
    </div>
  );
}

function Step({ icon, title, tone }: { icon: ReactNode; title: string; tone: "brand" | "sun" | "accent" }) {
  return (
    <div className={`${styles.step} ${styles[tone]}`}>
      <span className={styles.stepIcon}>{icon}</span>
      <span className={styles.stepTitle}>{title}</span>
    </div>
  );
}
