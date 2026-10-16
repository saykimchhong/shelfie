"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "../Button/Button";
import styles from "./Sheet.module.scss";

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  // Sticky action row at the bottom (Save / Order…).
  footer?: ReactNode;
};

// Longest close transition in Sheet.module.scss, plus a little slack.
const EXIT_MS = 320;

// Bottom sheet on phones, centered dialog on wider screens. Native <dialog>
// gives focus trapping, Esc to close and an accessible modal for free. Open
// and close are CSS transitions (transform + opacity only).
export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // Keep the content mounted while the close animation plays, then drop it
  // (so forms inside start fresh next time).
  const [wasOpen, setWasOpen] = useState(open);
  const [closing, setClosing] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    setClosing(!open);
  }

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => setClosing(false), EXIT_MS);
    return () => clearTimeout(timer);
  }, [closing]);

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
        <div className={styles.body}>{open || closing ? children : null}</div>
        {footer && (open || closing) ? <footer className={styles.footer}>{footer}</footer> : null}
      </div>
    </dialog>
  );
}
