"use client";

import { useSyncExternalStore } from "react";
import { openState, type OpeningHours, type OpenState } from "@/domain/hours";

const subscribe = (notify: () => void) => {
  const timer = setInterval(notify, 30_000);
  return () => clearInterval(timer);
};

// Open or closed right now, rechecked every half minute. null on the server and
// before hydration: the storefront page is cached, so it can't know the time.
export function useOpenState(hours: OpeningHours | undefined, timeZone: string | undefined): OpenState | null {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => (hours ? JSON.stringify(openState(hours, new Date(), timeZone)) : null),
    () => null,
  );
  return snapshot ? (JSON.parse(snapshot) as OpenState) : null;
}
