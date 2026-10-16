import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Spinner } from "../Spinner/Spinner";
import styles from "./Button.module.scss";

type Variant = "primary" | "soft" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type StyleProps = {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: ReactNode;
  // Trailing icon, e.g. an arrow on "Next".
  iconAfter?: ReactNode;
  // Square button with just the icon. Always pass an aria-label.
  iconOnly?: boolean;
};

function buttonClass({ variant = "primary", size = "md", block, iconOnly }: StyleProps, className?: string) {
  return clsx(styles.button, styles[variant], styles[size], block && styles.block, iconOnly && styles.iconOnly, className);
}

export type ButtonProps = ComponentProps<"button"> & StyleProps & { loading?: boolean };

export function Button({
  variant,
  size,
  block,
  icon,
  iconAfter,
  iconOnly,
  loading,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, block, iconOnly }, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size={size === "lg" ? 20 : 16} /> : icon}
      {children && !iconOnly ? <span>{children}</span> : null}
      {iconAfter}
    </button>
  );
}

export type ButtonLinkProps = ComponentProps<typeof Link> & StyleProps;

export function ButtonLink({
  variant,
  size,
  block,
  icon,
  iconAfter,
  iconOnly,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={buttonClass({ variant, size, block, iconOnly }, className)} {...rest}>
      {icon}
      {children && !iconOnly ? <span>{children}</span> : null}
      {iconAfter}
    </Link>
  );
}
