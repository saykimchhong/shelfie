"use client";

import clsx from "clsx";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import styles from "./Select.module.scss";

export type SelectOption<T extends string> = {
  value: T;
  label: string;
  // The language the label is written in, when not the page's.
  lang?: string;
};

export type SelectProps<T extends string> = {
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  // What is being chosen, for screen readers: "Language".
  label: string;
  icon?: ReactNode;
  size?: "sm" | "md";
  // raised: floats on a coloured area. soft: sits on a card.
  tone?: "raised" | "soft";
  // Which edge of the button the menu lines up with.
  align?: "start" | "end";
  className?: string;
};

// Longest close animation in Select.module.scss, plus a little slack.
const EXIT_MS = 160;
// A row's height and the menu's padding, to know if it fits below the button.
const ROW_PX = 44;
const MENU_PADDING_PX = 12;

// A pill that opens a short menu. Arrow keys, Home/End, Enter and Esc work as
// in a system menu; a tap outside closes it.
export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  icon,
  size = "md",
  tone = "raised",
  align = "start",
  className,
}: SelectProps<T>) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  // Opens upward when there's no room below.
  const [upward, setUpward] = useState(false);
  const selected = options.find((option) => option.value === value) ?? options[0];

  // Keep the menu mounted while its close animation plays.
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

  // Opening moves focus to the chosen row; a tap or focus elsewhere closes.
  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();

    const outside = (event: Event) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
    };
  }, [open]);

  function show() {
    const box = trigger.current?.getBoundingClientRect();
    const needed = options.length * ROW_PX + MENU_PADDING_PX;
    const below = box ? window.innerHeight - box.bottom : needed;
    setUpward(below < needed && (box?.top ?? 0) > below);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  function choose(next: T) {
    if (next !== value) onChange(next);
    close();
  }

  function onTriggerKey(event: KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      show();
    }
  }

  function onListKey(event: KeyboardEvent) {
    const rows = [...(list.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];
    const at = rows.indexOf(document.activeElement as HTMLElement);
    const move = (index: number) => rows[(index + rows.length) % rows.length]?.focus();

    if (event.key === "ArrowDown") move(at + 1);
    else if (event.key === "ArrowUp") move(at - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(rows.length - 1);
    else if (event.key === "Escape") close();
    else if (event.key === "Tab") return setOpen(false);
    else if ((event.key === "Enter" || event.key === " ") && at >= 0) choose(options[at].value);
    else return;
    event.preventDefault();
  }

  return (
    <div ref={root} className={clsx(styles.root, styles[size], styles[tone], className)}>
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-label={`${label}: ${selected.label}`}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onTriggerKey}
      >
        {icon ? <span className={styles.icon}>{icon}</span> : null}
        <span lang={selected.lang}>{selected.label}</span>
        <ChevronDown aria-hidden className={clsx(styles.chevron, open && styles.chevronOpen)} />
      </button>

      {open || closing ? (
        <ul
          ref={list}
          id={`${id}-list`}
          role="listbox"
          aria-label={label}
          className={clsx(styles.menu, styles[align], upward && styles.upward)}
          data-state={open ? "open" : "closing"}
          onKeyDown={onListKey}
        >
          {options.map((option) => {
            const chosen = option.value === selected.value;
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={chosen}
                tabIndex={-1}
                lang={option.lang}
                className={clsx(styles.option, chosen && styles.chosen)}
                onClick={() => choose(option.value)}
              >
                <span>{option.label}</span>
                {chosen ? <Check aria-hidden className={styles.tick} /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
