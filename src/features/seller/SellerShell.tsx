"use client";

import Link from "next/link";
import { ViewTransition, type ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Container } from "@/components/ui";
import { AccountMenu } from "./AccountMenu";
import styles from "./SellerShell.module.scss";

export function SellerShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <Container className={styles.bar}>
          <Link href="/dashboard" aria-label="Shelfie dashboard">
            <Logo size={30} />
          </Link>
          <AccountMenu />
        </Container>
      </header>
      <Container as="main" className={styles.main}>
        {/* Going between dashboard pages fades the content; the top bar stays put. */}
        <ViewTransition default="none" update="page">
          {children}
        </ViewTransition>
      </Container>
    </div>
  );
}
