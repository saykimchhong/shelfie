import { Container, Skeleton, Stack } from "@/components/ui";
import styles from "./StorefrontView.module.scss";

// Static shell shown instantly while the store streams in.
export function StorefrontSkeleton() {
  return (
    <div className={styles.page} aria-busy>
      <Container className={styles.header} style={{ paddingTop: "var(--space-12)" }}>
        <Skeleton width={88} height={88} radius="50%" />
        <Skeleton width={220} height={36} />
      </Container>
      <Container className={styles.main}>
        <div className={styles.grid}>
          {Array.from({ length: 8 }, (_, index) => (
            <Stack key={index} gap={2}>
              <Skeleton height="auto" radius="var(--radius-lg)" className={styles.skeletonCard} />
              <Skeleton width="70%" height={14} />
            </Stack>
          ))}
        </div>
      </Container>
    </div>
  );
}
