"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentEvent } from "@/domain/agents";
import { AgentActivityFeed } from "@/features/capture/AgentActivityFeed";
import { MagicBurst } from "./MagicBurst";
import styles from "./AgentRunDemo.module.scss";

// A first video's run, as the seller watches it: [ms after the step is in focus, event].
const TIMELINE: [number, AgentEvent][] = [
  [300, { step: "watcher", status: "running" }],
  [1100, { step: "watcher", status: "done", summary: "Found 6 products, heard 6 prices" }],
  [1100, { step: "priceMatcher", status: "running" }],
  [1500, { step: "priceMatcher", status: "done", summary: "Paired 6 prices" }],
  [1500, { step: "shelfMatcher", status: "skipped" }],
  [1500, { step: "checker", status: "running" }],
  [1900, { step: "checker", status: "done", summary: "All clear" }],
];
const FINISHED = TIMELINE.map(([, event]) => event);

// The real agent feed, run once when its step comes into focus (GuidedSteps
// sets data-state on the step), ending in a burst of stars. Until then it
// waits; without the guided focus (no JS, reduced motion) it shows the
// finished run, no stars.
export function AgentRunDemo({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<readonly AgentEvent[]>(FINISHED);
  const [boom, setBoom] = useState(false);

  useEffect(() => {
    const step = ref.current?.closest("li");
    if (!step) return;
    const timers: number[] = [];
    const observer = new MutationObserver(() => {
      const state = step.dataset.state;
      if (state === "waiting") return setEvents([]);
      observer.disconnect();
      // Scrolled straight past it: no need to play.
      if (state !== "current") return setEvents(FINISHED);
      setEvents([]);
      for (const [at, event] of TIMELINE) {
        timers.push(window.setTimeout(() => setEvents((current) => [...current, event]), at));
      }
      timers.push(window.setTimeout(() => setBoom(true), TIMELINE[TIMELINE.length - 1][0] + 150));
    });
    observer.observe(step, { attributes: true, attributeFilter: ["data-state"] });
    return () => {
      observer.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  // Decorative: the step's own text says what happens. The stars sit outside
  // the box so its rounded corners don't clip them.
  return (
    <div ref={ref} className={styles.run} aria-hidden>
      <div className={className}>
        <AgentActivityFeed steps={events} variant="live" />
      </div>
      {boom ? <MagicBurst scale={2.3} grow={1.6} /> : null}
    </div>
  );
}
