"use client";

import { LogOut } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Avatar } from "@/components/ui";
import { useAuth, useSignedInUser } from "@/features/auth";
import styles from "./AccountMenu.module.scss";

// The seller's picture opens a small menu with who's signed in and Sign out,
// so the top bar stays clear on a phone.
export function AccountMenu() {
  const user = useSignedInUser();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !root.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={root} className={styles.root}>
      <button
        type="button"
        className={styles.trigger}
        aria-label="Your account"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <Avatar name={user.name} src={user.photoURL} size={36} />
      </button>
      {open ? (
        <div id={menuId} role="menu" className={styles.menu}>
          <div className={styles.who}>
            <strong>{user.name}</strong>
            {user.email ? <span>{user.email}</span> : null}
          </div>
          <button type="button" role="menuitem" className={styles.item} onClick={signOut}>
            <LogOut aria-hidden />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
