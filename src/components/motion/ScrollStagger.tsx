"use client";

import { useEffect, useRef } from "react";
import { Stagger, type StaggerProps } from "./Reveal";

// <Stagger> for long lists: children on screen at load stagger in as usual;
// the rest wait and rise in when scrolled into view. IntersectionObserver only
// flips a data attribute, and CSS plays a short transform/opacity animation —
// no scroll listeners, nothing scrubbed, so it can't get stuck half-way.
export function ScrollStagger(props: Omit<StaggerProps, "ref">) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const seen = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        let order = 0;
        for (const entry of entries) {
          const item = entry.target as HTMLElement;
          if (!seen.has(item)) {
            // First report = where the item started.
            seen.add(item);
            if (entry.isIntersecting) observer.unobserve(item); // already visible: leave it be
            else item.dataset.reveal = "waiting";
            continue;
          }
          if (entry.isIntersecting) {
            item.style.setProperty("--reveal-order", String(order++));
            item.dataset.reveal = "in";
            observer.unobserve(item);
          }
        }
      },
      // Start as soon as any part peeks in, so a partly visible card is never blank.
      { threshold: 0 },
    );

    // Also watch items added later (live product updates, category filter).
    const watchChildren = () => {
      for (const child of root.children) if (!seen.has(child)) observer.observe(child);
    };
    watchChildren();
    const mutations = new MutationObserver(watchChildren);
    mutations.observe(root, { childList: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, []);

  return <Stagger ref={ref} {...props} />;
}
