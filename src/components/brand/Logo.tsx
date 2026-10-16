import clsx from "clsx";
import { useId } from "react";
import styles from "./Logo.module.scss";

export function LogoMark({ size = 32 }: { size?: number }) {
  const gradientId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className={styles.mark}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF8A4C" />
          <stop offset="1" stopColor="#E5486F" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      {/* Two shelves with goods on them. */}
      <rect x="8" y="9" width="4" height="5" rx="1.2" fill="#fff" />
      <rect x="13.5" y="7" width="4" height="7" rx="1.2" fill="#fff" fillOpacity="0.85" />
      <circle cx="21.5" cy="11.5" r="2.5" fill="#FFD166" />
      <rect x="6" y="15" width="20" height="2" rx="1" fill="#fff" />
      <rect x="9" y="19.5" width="6" height="4.5" rx="1.2" fill="#FFD166" />
      <rect x="17" y="19" width="4" height="5" rx="1.2" fill="#fff" fillOpacity="0.85" />
      <rect x="6" y="25" width="20" height="2" rx="1" fill="#fff" />
    </svg>
  );
}

export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span className={clsx(styles.logo, className)}>
      <LogoMark size={size} />
      <span className={styles.word} style={{ fontSize: size * 0.62 }}>
        Shelfie
      </span>
    </span>
  );
}
