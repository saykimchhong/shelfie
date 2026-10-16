"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Avatar, Button, Container } from "@/components/ui";
import { useAuth, useSignedInUser } from "@/features/auth";
import styles from "./SellerShell.module.scss";

export function SellerShell({ children }: { children: ReactNode }) {
  const user = useSignedInUser();
  const { signOut } = useAuth();

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <Container className={styles.bar}>
          <Link href="/dashboard" aria-label="Shelfie dashboard">
            <Logo size={30} />
          </Link>
          <div className={styles.account}>
            <Avatar name={user.name} src={user.photoURL} size={34} />
            <Button variant="ghost" size="sm" iconOnly icon={<LogOut />} aria-label="Sign out" onClick={signOut} />
          </div>
        </Container>
      </header>
      <Container as="main" className={styles.main}>
        {children}
      </Container>
    </div>
  );
}
