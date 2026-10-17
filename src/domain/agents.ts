import { z } from "zod";

// The shelf-reading pipeline, in the order the steps run. The activity feed
// shows one row per step.
export const AGENT_STEPS = ["watcher", "priceMatcher", "shelfMatcher", "checker"] as const;
export const agentStepSchema = z.enum(AGENT_STEPS);
export type AgentStep = z.infer<typeof agentStepSchema>;

export const AGENT_STATUSES = ["running", "done", "skipped", "failed"] as const;
export const agentStatusSchema = z.enum(AGENT_STATUSES);
export type AgentStatus = z.infer<typeof agentStatusSchema>;

export const agentEventSchema = z.object({
  step: agentStepSchema,
  status: agentStatusSchema,
  // What the step found, e.g. "Found 18 products, heard 16 prices".
  summary: z.string().optional(),
});

export type AgentEvent = z.infer<typeof agentEventSchema>;
