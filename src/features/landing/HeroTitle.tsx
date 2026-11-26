"use client";

import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Text } from "@/components/ui";
import { TAGLINES, taglineIndexFor } from "./taglines";
import styles from "./HeroTitle.module.scss";

// How long each language stays before the next one comes in.
const HOLD_MS = 2400;

// "Film your shelf." stays; the second line goes round every language Shelfie
// speaks, starting on the visitor's own. The language buttons below pick one
// and hold it there. With reduced motion it stays on the visitor's language.
export function HeroTitle() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [visitor, setVisitor] = useState(0);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const own = taglineIndexFor(navigator.languages ?? [navigator.language]);
    const first = window.setTimeout(() => {
      setVisitor(own);
      setIndex(own);
    }, 0);
    return () => window.clearTimeout(first);
  }, []);

  useEffect(() => {
    if (reduce || held) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % TAGLINES.length), HOLD_MS);
    return () => window.clearInterval(timer);
  }, [reduce, held]);

  const tagline = TAGLINES[index];
  return (
    <div className={styles.hero}>
      <Text as="h1" size="display" align="center" className={styles.title}>
        Film your shelf.
        <span className={styles.srOnly}> Get a shop online.</span>
        <span className={styles.rotator} aria-hidden>
          <AnimatePresence initial={false}>
            <motion.span
              key={tagline.language}
              lang={tagline.language}
              className={styles.line}
              initial={{ opacity: 0, y: "0.5em" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "-0.5em" }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              {tagline.text}
            </motion.span>
          </AnimatePresence>
        </span>
      </Text>

      <div className={styles.languages} role="group" aria-label="Shelfie speaks">
        {TAGLINES.map((option, at) => (
          <button
            key={option.language}
            type="button"
            lang={option.language}
            aria-pressed={held && at === index}
            className={clsx(styles.language, at === index && styles.active)}
            onClick={() => {
              setIndex(at);
              setHeld(true);
            }}
          >
            {option.name}
            {at === visitor && option.language !== "en" ? <span className={styles.yours}>yours</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
