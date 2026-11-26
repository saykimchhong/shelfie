import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Container, Text } from "@/components/ui";
import styles from "./SiteFooter.module.scss";

const LINKS = [
  { href: "/templates", label: "Example shops" },
  { href: "/login", label: "Sign in" },
  { href: "/privacy", label: "Privacy" },
];

// The public pages' footer: who we are, where to go, and the privacy notice.
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <Container className={styles.inner}>
        <div className={styles.brand}>
          <Link href="/" aria-label="Shelfie home">
            <Logo size={28} />
          </Link>
          <Text size="sm" tone="muted">
            Film your shelf. Get a shop. Built with Gemini on Google Cloud.
          </Text>
        </div>
        <nav aria-label="Footer">
          <ul className={styles.links}>
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <Text size="xs" tone="subtle" className={styles.legal}>
          © 2026 Shelfie. Free for small sellers.
        </Text>
      </Container>
    </footer>
  );
}
