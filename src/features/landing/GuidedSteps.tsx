"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Matches the `lg` breakpoint, where the steps sit side by side.
const SIDE_BY_SIDE = "(min-width: 1024px)";
const STEP_MS = 850;

// Walks a visitor through the steps: the current one in focus, earlier ones
// done, later ones waiting (data-state on each child; CSS does the rest).
// Side by side, it plays once when the steps come into view; stacked, it
// follows the scroll. Without JS, with reduced motion, or when the steps are
// already on screen at load, nothing is set and every step shows as usual.
export function GuidedSteps({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (root.getBoundingClientRect().top < window.innerHeight) return;

    const steps = [...root.children] as HTMLElement[];
    const show = (current: number) =>
      steps.forEach((step, index) => {
        step.dataset.state = index < current ? "done" : index === current ? "current" : "waiting";
      });
    show(-1);

    if (window.matchMedia(SIDE_BY_SIDE).matches) {
      const timers: number[] = [];
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          observer.disconnect();
          // One step at a time, then all done.
          for (let index = 0; index <= steps.length; index++) {
            timers.push(window.setTimeout(() => show(index), index * STEP_MS));
          }
        },
        { threshold: 0.4 },
      );
      observer.observe(root);
      return () => {
        observer.disconnect();
        timers.forEach((timer) => window.clearTimeout(timer));
      };
    }

    // Stacked: a step is reached once its top passes the middle of the screen.
    const reached = new Map<Element, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          reached.set(entry.target, entry.isIntersecting || entry.boundingClientRect.top < 0);
        }
        show(steps.filter((step) => reached.get(step)).length - 1);
      },
      { rootMargin: "0px 0px -50% 0px" },
    );
    steps.forEach((step) => observer.observe(step));
    return () => observer.disconnect();
  }, []);

  return (
    <ol ref={ref} className={className}>
      {children}
    </ol>
  );
}
