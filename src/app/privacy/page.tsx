import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink, Container, Text } from "@/components/ui";
import { SiteFooter } from "@/features/landing";
import styles from "./privacy.module.scss";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Shelfie keeps, why, and who sees it.",
};

const CONTACT = "https://github.com/saykimchhong/shelfie/issues";

// Plain words, matching what the app really does. When what Shelfie stores
// changes (src/domain/, firestore.rules), update this page too.
export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <Container as="header" className={styles.nav}>
        <Link href="/" aria-label="Shelfie home" className={styles.home}>
          <Logo />
        </Link>
        <ButtonLink href="/login" variant="soft" size="sm">
          Sign in
        </ButtonLink>
      </Container>

      <main>
        <Container className={styles.body}>
          <Text as="h1" size="3xl">
            Privacy
          </Text>
          <Text tone="subtle" size="sm">
            Updated 27 November 2026
          </Text>
          <Text size="lg" tone="muted">
            Shelfie puts small shops online. Here is what we keep, why, and who sees it. We don&apos;t sell data
            and we don&apos;t show ads.
          </Text>

          <section>
            <Text as="h2" size="xl" weight={700}>
              If you sell on Shelfie
            </Text>
            <ul>
              <li>
                <strong>Your Google sign-in.</strong> Your name, email and profile picture, so only you can change your
                shop.
              </li>
              <li>
                <strong>Your shop.</strong> Its name, products, prices, photos, logo, opening hours, payment QR code and
                the WhatsApp number or LINE ID you add. Once you publish, these are public, because customers need them
                to order and pay. A hidden shop is visible only to you.
              </li>
              <li>
                <strong>Videos, photos and lists.</strong> What you send to build or update your shop, voice notes
                included, is read by Google&apos;s Gemini AI. Videos are deleted once they&apos;re read. The product
                photos you save stay with your shop.
              </li>
              <li>
                <strong>Chats with your assistant.</strong> Each message is sent to Gemini to read the changes. The chat
                history stays in your browser.
              </li>
            </ul>
          </section>

          <section>
            <Text as="h2" size="xl" weight={700}>
              If you shop on Shelfie
            </Text>
            <ul>
              <li>No account, and nothing about you is kept by Shelfie.</li>
              <li>Your cart and language choice stay in your browser.</li>
              <li>
                Your order goes from your phone straight to the seller&apos;s WhatsApp or LINE. Shelfie doesn&apos;t see
                it and never handles payments: you pay the seller directly.
              </li>
            </ul>
          </section>

          <section>
            <Text as="h2" size="xl" weight={700}>
              Who else handles it
            </Text>
            <ul>
              <li>Google Cloud and Firebase host Shelfie and store shops and photos.</li>
              <li>Google&apos;s Gemini API reads videos, photos, lists and messages.</li>
              <li>WhatsApp and LINE carry orders, under their own privacy policies.</li>
            </ul>
          </section>

          <section>
            <Text as="h2" size="xl" weight={700}>
              Your choices
            </Text>
            <ul>
              <li>Edit or remove any product, or hide your shop, at any time from your dashboard.</li>
              <li>
                To delete your account and shop, or ask what we hold about you,{" "}
                <a href={CONTACT} target="_blank" rel="noreferrer">
                  contact the Shelfie team
                </a>
                .
              </li>
            </ul>
          </section>
        </Container>
      </main>

      <SiteFooter />
    </div>
  );
}
