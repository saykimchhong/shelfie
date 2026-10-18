import { AGENT_STEPS, type AgentEvent, type AgentStatus, type AgentStep } from "@/domain/agents";

// A step that hasn't reported yet is still waiting its turn.
export type FeedStatus = AgentStatus | "waiting";

export type FeedRow = { step: AgentStep; label: string; status: FeedStatus; line: string };

type StepCopy = { label: string; doing: string; done: string; skipped: string; failed: string };

const COPY: Record<AgentStep, StepCopy> = {
  watcher: {
    label: "Watching your video",
    doing: "Spotting products and prices",
    done: "Done",
    skipped: "Skipped",
    failed: "Couldn't read the video",
  },
  priceMatcher: {
    label: "Matching prices",
    doing: "Pairing prices with products",
    done: "Done",
    skipped: "Skipped",
    failed: "Couldn't pair the prices",
  },
  shelfMatcher: {
    label: "Checking your shelf",
    doing: "Finding what you already sell",
    done: "Done",
    // Only ever skipped on a new shelf: there's nothing listed to compare with.
    skipped: "New shelf, nothing to compare",
    // Not fatal: the review still matches known products by name.
    failed: "The review will match by name",
  },
  checker: {
    label: "Double-checking",
    doing: "Looking for anything odd",
    done: "Done",
    skipped: "Skipped",
    failed: "Couldn't check the list",
  },
};

// One row per pipeline step, in the order they run, from the events so far.
// Each step reports more than once (running, then done), so the latest wins.
export function feedRows(events: readonly AgentEvent[]): FeedRow[] {
  const latest = new Map<AgentStep, AgentEvent>();
  for (const event of events) latest.set(event.step, event);

  return AGENT_STEPS.map((step) => {
    const copy = COPY[step];
    const event = latest.get(step);
    const status: FeedStatus = event?.status ?? "waiting";
    const line =
      status === "waiting" || status === "running"
        ? copy.doing
        : status === "failed"
          ? copy.failed
          : (event?.summary ?? copy[status]);
    return { step, label: copy.label, status, line };
  });
}
