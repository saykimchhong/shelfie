"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "../Button/Button";
import styles from "./Sheet.module.scss";

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  // Sticky action row at the bottom (Save / Delete…).
  footer?: ReactNode;
};

// Bottom sheet on phones, centered dialog on wider screens. Native <dialog>
// gives us focus trapping, Esc to close and an accessible modal for free.
export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      // A click on the dialog itself (not the panel) is a click on the backdrop.
      onClick={(event) => event.target === ref.current && onClose()}
    >
      <div className={styles.panel}>
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <Button variant="ghost" size="sm" iconOnly icon={<X />} aria-label="Close" onClick={onClose} />
        </header>
        <div className={styles.body}>{open ? children : null}</div>
        {footer ? <footer className={styles.footer}>{footer}</footer> : null}
      </div>
    </dialog>
  );
}
