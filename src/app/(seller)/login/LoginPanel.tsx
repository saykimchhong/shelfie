"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/brand/Logo";
import { Reveal } from "@/components/motion/Reveal";
import { Stack, Surface, Text } from "@/components/ui";
import { FullScreenLoader, GoogleSignInButton, useAuth } from "@/features/auth";
import { site } from "@/lib/site";
import styles from "./login.module.scss";

// Only same-site paths, so ?next= can't bounce people to another domain.
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export function LoginPanel() {
  const { status } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));

  useEffect(() => {
    if (status === "signed-in") router.replace(next);
  }, [status, next, router]);

  if (status !== "signed-out") return <FullScreenLoader />;

  return (
    <main className={styles.screen}>
      <Reveal effect="pop" className={styles.card}>
        <Surface padding="lg" radius="xl">
          <Stack gap={6} align="center">
            <Link href="/" aria-label="Shelfie home">
              <Logo size={40} />
            </Link>
            <Text size="xl" weight={700} align="center">
              {site.tagline}
            </Text>
            <Stack gap={3} className={styles.actions}>
              <GoogleSignInButton />
            </Stack>
          </Stack>
        </Surface>
      </Reveal>
    </main>
  );
}
