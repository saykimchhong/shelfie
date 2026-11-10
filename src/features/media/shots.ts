import type { FrameBox } from "@/domain/extraction";
import { SHOT_FRAMES, SHOT_SPREAD_SECONDS, type ShotPick } from "@/domain/photos";
import type { FrameRequest } from "./video";

export type ShotTarget = { name: string; localName: string | null; seconds: number; box: FrameBox | null };

export function shotTimes(seconds: number): number[] {
  const half = Math.floor(SHOT_FRAMES / 2);
  const times = Array.from({ length: SHOT_FRAMES }, (_, index) => (index - half) * SHOT_SPREAD_SECONDS + seconds);
  return [...new Set(times.map((time) => Math.max(0, Math.round(time * 100) / 100)))];
}

// offered[i]: the times product i's frames were taken at.
export function shotRequests(
  targets: readonly ShotTarget[],
  offered: readonly number[][],
  picks: readonly (ShotPick | null)[],
): FrameRequest[] {
  return targets.map((target, index) => {
    const pick = picks[index];
    const seconds = pick && pick.frame !== null ? offered[index]?.[pick.frame] : undefined;
    return seconds !== undefined && pick?.box
      ? { seconds, box: pick.box, exact: true }
      : { seconds: target.seconds, box: target.box };
  });
}
