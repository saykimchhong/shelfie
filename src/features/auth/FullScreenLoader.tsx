import { LogoMark } from "@/components/brand/Logo";
import styles from "./FullScreenLoader.module.scss";

export function FullScreenLoader() {
  return (
    <div className={styles.screen} role="status" aria-label="Loading">
      <div className={styles.mark}>
        <LogoMark size={48} />
      </div>
    </div>
  );
}
