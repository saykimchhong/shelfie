import clsx from "clsx";
import { Check, Minus, TriangleAlert } from "lucide-react";
import { Spinner } from "@/components/ui";
import type { AgentEvent } from "@/domain/agents";
import { feedRows, type FeedStatus } from "./agentFeed";
import styles from "./AgentActivityFeed.module.scss";

const STATUS_TEXT: Record<FeedStatus, string> = {
  waiting: "Waiting",
  running: "Working",
  done: "Done",
  skipped: "Skipped",
  failed: "Failed",
};

export type AgentActivityFeedProps = {
  // Every step event so far, in arrival order (from requestExtraction's onStep).
  steps: readonly AgentEvent[];
  // "live" while the video is read; "recap" shows the finished run on the review.
  variant?: "live" | "recap";
  className?: string;
};

// The shelf-reading agents, one row each: what they're doing, then what they found.
export function AgentActivityFeed({ steps, variant = "live", className }: AgentActivityFeedProps) {
  const live = variant === "live";
  return (
    <ol
      className={clsx(styles.feed, styles[variant], className)}
      aria-label="AI agents"
      aria-live={live ? "polite" : undefined}
    >
      {feedRows(steps).map((row) => (
        <li key={row.step} className={clsx(styles.row, styles[row.status])}>
          {/* Keyed by status so the new icon pops in when the step moves on. */}
          <span key={row.status} className={styles.icon} aria-hidden>
            <StatusIcon status={row.status} />
          </span>
          <span className={styles.text}>
            <span className={styles.label}>
              {row.label}
              <span className={styles.srOnly}>: {STATUS_TEXT[row.status]}.</span>
            </span>
            <span key={row.line} className={styles.line}>
              {row.line}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function StatusIcon({ status }: { status: FeedStatus }) {
  switch (status) {
    case "running":
      return <Spinner size={18} />;
    case "done":
      return <Check />;
    case "skipped":
      return <Minus />;
    case "failed":
      return <TriangleAlert />;
    default:
      return <span className={styles.dot} />;
  }
}
