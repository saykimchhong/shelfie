"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { GREETINGS, greetingIndexFor } from "./greetings";
import styles from "./HelloGreeting.module.scss";

// How long each greeting stays before the next one comes in.
const HOLD_MS = 1900;

// "Hello" going round every language Shelfie speaks, like a new iPhone's first
// screen. It starts on the visitor's own language. With reduced motion it
// just says hello in that language. It never blocks the page.
export function HelloGreeting() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let current = greetingIndexFor(navigator.languages ?? [navigator.language]);
    const first = window.setTimeout(() => setIndex(current), 0);
    if (reduce) return () => window.clearTimeout(first);
    const timer = window.setInterval(() => {
      current = (current + 1) % GREETINGS.length;
      setIndex(current);
    }, HOLD_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [reduce]);

  const greeting = GREETINGS[index];
  return (
    <p className={styles.hello}>
      <span className={styles.srOnly}>Hello</span>
      <AnimatePresence initial={false}>
        <motion.span
          key={greeting.language}
          lang={greeting.language}
          aria-hidden
          className={styles.word}
          initial={{ opacity: 0, y: "0.4em" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "-0.4em" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {greeting.word}
        </motion.span>
      </AnimatePresence>
    </p>
  );
}
